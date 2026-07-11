import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { REDIS } from '@app/redis';
import { EnvironmentVariables } from '@app/config';
import { PrismaService, OrderStatus, PaymentStatus, TicketStatus } from '@app/prisma';
import { PAYMENT_FAIL_MESSAGES, PaymentFailCode, TOPICS } from '@app/contracts';
import { HoldResultDto, OrderResultDto, OrderViewDto } from './dto';

const MAX_PER_CONCERT = 2; // 1인 공연당 최대 매수

/** 예매 쓰기: 좌석 hold(Redis 원자) → 주문 생성 + Outbox. reservation-service 소유. */
@Injectable()
export class BookingService implements OnModuleInit {
  private holdSha = '';
  private readonly holdScript = readFileSync(join(__dirname, 'lua', 'hold.lua'), 'utf8');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit() {
    this.holdSha = (await this.redis.script('LOAD', this.holdScript)) as string;
  }

  private holdsKey = (concertId: string) => `holds:${concertId}`;
  private ownerKey = (concertId: string) => `holds:${concertId}:owner`;
  private get ttlSec() {
    return this.config.get('SEAT_HOLD_TTL_SEC', { infer: true });
  }

  /** 사용자가 이 공연에서 이미 보유(PENDING/CONFIRMED)한 좌석 수. */
  private ownedCount(userId: string, concertId: string) {
    return this.prisma.reservation.count({
      where: {
        ticket: { concertId },
        order: { userId, status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] } },
      },
    });
  }

  private async loadTickets(concertId: string, ticketIds: string[]) {
    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: ticketIds }, concertId, deletedAt: null },
      select: { id: true, seatId: true, status: true, price: true },
    });
    if (tickets.length !== ticketIds.length)
      throw new BadRequestException('유효하지 않은 좌석이 포함되어 있습니다.');
    if (tickets.some((t) => t.status === TicketStatus.SOLD))
      throw new ConflictException('이미 판매된 좌석이 있습니다.');
    return tickets;
  }

  /** 좌석 원자 선점(Redis). 오버셀 1차 방어. */
  async hold(concertId: string, userId: string, ticketIds: string[]): Promise<HoldResultDto> {
    const tickets = await this.loadTickets(concertId, ticketIds);

    const owned = await this.ownedCount(userId, concertId);
    if (owned + ticketIds.length > MAX_PER_CONCERT)
      throw new BadRequestException(`1인 최대 ${MAX_PER_CONCERT}매까지 예매할 수 있습니다.`);

    const now = Date.now();
    const expiry = now + this.ttlSec * 1000;
    const seatIds = tickets.map((t) => t.seatId);
    const ok = await this.runHold(concertId, userId, now, expiry, seatIds);
    if (ok !== 1)
      throw new ConflictException('다른 사용자가 선점한 좌석이 있습니다. 다시 선택해주세요.');

    return {
      concertId,
      ticketIds,
      seatIds,
      amount: tickets.reduce((s, t) => s + t.price, 0),
      expiresAt: new Date(expiry).toISOString(),
      holdSeconds: this.ttlSec,
    };
  }

  /** 좌석 선점 해제(선택 취소). 내 소유 hold만 즉시 반환(TTL 대기 X). */
  async releaseHold(
    concertId: string,
    userId: string,
    ticketIds: string[],
  ): Promise<{ released: number }> {
    if (!ticketIds?.length) throw new BadRequestException('해제할 좌석을 지정하세요.');
    const tickets = await this.prisma.ticket.findMany({
      where: { id: { in: ticketIds }, concertId },
      select: { seatId: true },
    });
    // 내가 소유한 hold만 해제(남의 것 못 풀게)
    const mine: string[] = [];
    for (const t of tickets) {
      const owner = await this.redis.hget(this.ownerKey(concertId), t.seatId);
      if (owner === userId) mine.push(t.seatId);
    }
    if (mine.length) {
      await Promise.all([
        this.redis.zrem(this.holdsKey(concertId), ...mine),
        this.redis.hdel(this.ownerKey(concertId), ...mine),
      ]);
    }
    return { released: mine.length };
  }

  /** 예매 생성: 주문(PENDING) + 항목 + Outbox를 한 트랜잭션으로. 결제는 비동기. */
  async reserve(concertId: string, userId: string, ticketIds: string[]): Promise<OrderResultDto> {
    const tickets = await this.loadTickets(concertId, ticketIds);

    // 내가 유효하게 hold 중인지 확인(만료/타인 점유면 거절)
    const now = Date.now();
    for (const t of tickets) {
      const [sc, owner] = await Promise.all([
        this.redis.zscore(this.holdsKey(concertId), t.seatId),
        this.redis.hget(this.ownerKey(concertId), t.seatId),
      ]);
      if (!sc || Number(sc) <= now || owner !== userId)
        throw new ConflictException(
          '좌석 선점이 만료되었거나 내 좌석이 아닙니다. 다시 선택해주세요.',
        );
    }

    const owned = await this.ownedCount(userId, concertId);
    if (owned + ticketIds.length > MAX_PER_CONCERT)
      throw new BadRequestException(`1인 최대 ${MAX_PER_CONCERT}매까지 예매할 수 있습니다.`);

    const amount = tickets.reduce((s, t) => s + t.price, 0);
    const seatIds = tickets.map((t) => t.seatId);
    const orderNo = this.newOrderNo();

    const order = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: { orderNo, userId, concertId, amount, status: OrderStatus.PENDING },
      });
      await tx.reservation.createMany({
        data: tickets.map((t) => ({ orderId: o.id, ticketId: t.id, unitPrice: t.price })),
      });
      // 같은 트랜잭션에 이벤트 기록 → 릴레이가 Kafka 발행(dual-write 유실 방지)
      await tx.outbox.create({
        data: {
          aggregateType: 'order',
          aggregateId: o.id,
          eventType: TOPICS.ORDER_REQUESTED,
          payload: { orderId: o.id, userId, concertId, ticketIds, seatIds, amount },
        },
      });
      return o;
    });

    return { orderId: order.id, orderNo, amount, status: OrderStatus.PENDING, ticketIds };
  }

  /**
   * 결제 재시도(카드 변경 등). 실패한 주문을 다시 결제 흐름에 태운다.
   *  - 좌석 hold이 여전히 유효(내 소유)해야 함. 만료면 재선택 필요.
   *  - 멱등 마커 삭제 + Order PENDING + Outbox 재발행 → payment consumer 재처리.
   */
  async retryPayment(orderId: string, userId: string): Promise<OrderResultDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: {
        items: { include: { ticket: { select: { id: true, seatId: true, status: true } } } },
      },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.status !== OrderStatus.FAILED)
      throw new BadRequestException('실패한 주문만 재시도할 수 있습니다.');
    if (order.items.some((i) => i.ticket.status === TicketStatus.SOLD))
      throw new ConflictException('이미 판매된 좌석이 있습니다.');

    const ticketIds = order.items.map((i) => i.ticketId);
    const seatIds = order.items.map((i) => i.ticket.seatId);

    // hold 유효·소유 확인
    const now = Date.now();
    for (const seatId of seatIds) {
      const [sc, owner] = await Promise.all([
        this.redis.zscore(this.holdsKey(order.concertId), seatId),
        this.redis.hget(this.ownerKey(order.concertId), seatId),
      ]);
      if (!sc || Number(sc) <= now || owner !== userId)
        throw new ConflictException('좌석 선점이 만료되었습니다. 좌석을 다시 선택해주세요.');
    }

    // payment 멱등 마커 삭제(같은 Redis 공유) → consumer가 다시 처리
    await this.redis.del(`processed:order:${orderId}`);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.PENDING } });
      await tx.outbox.create({
        data: {
          aggregateType: 'order',
          aggregateId: orderId,
          eventType: TOPICS.ORDER_REQUESTED,
          payload: {
            orderId,
            userId,
            concertId: order.concertId,
            ticketIds,
            seatIds,
            amount: order.amount,
          },
        },
      });
    });

    return {
      orderId,
      orderNo: order.orderNo,
      amount: order.amount,
      status: OrderStatus.PENDING,
      ticketIds,
    };
  }

  /**
   * 예매 취소/환불. CONFIRMED + 관람 전만.
   * $transaction: Ticket SOLD→AVAILABLE(재고 복원) + Order CANCELLED + Payment REFUNDED.
   * (CANCELLED는 1인 2매 카운트에서 제외되므로 재구매 가능)
   */
  async cancelOrder(orderId: string, userId: string): Promise<OrderViewDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: {
        concert: { select: { startsAt: true } },
        payment: { select: { id: true } },
        items: { select: { ticketId: true } },
      },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (order.status !== OrderStatus.CONFIRMED)
      throw new BadRequestException('확정된 주문만 취소할 수 있습니다.');
    if (order.concert.startsAt <= new Date())
      throw new BadRequestException('이미 시작된 공연은 취소할 수 없습니다.');

    const ticketIds = order.items.map((i) => i.ticketId);
    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.updateMany({
        where: { id: { in: ticketIds }, status: TicketStatus.SOLD },
        data: { status: TicketStatus.AVAILABLE },
      });
      await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } });
      if (order.payment) {
        await tx.payment.update({
          where: { orderId },
          data: { status: PaymentStatus.REFUNDED, refundedAt: new Date() },
        });
      }
    });
    return this.getOrder(orderId, userId);
  }

  /** 주문 조회(상태 폴링·마이페이지). 소유자만. */
  async getOrder(orderId: string, userId: string): Promise<OrderViewDto> {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: {
        concert: { select: { name: true } },
        payment: { select: { status: true, failCode: true } },
        items: {
          include: {
            ticket: {
              select: {
                grade: true,
                seat: { select: { floor: true, section: true, seatRow: true, seatNo: true } },
              },
            },
          },
        },
      },
    });
    if (!o) throw new NotFoundException('주문을 찾을 수 없습니다.');
    return this.toView(o);
  }

  /** 내 주문 목록(마이페이지). */
  async listOrders(userId: string): Promise<OrderViewDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        concert: { select: { name: true } },
        payment: { select: { status: true, failCode: true } },
        items: {
          include: {
            ticket: {
              select: {
                grade: true,
                seat: { select: { floor: true, section: true, seatRow: true, seatNo: true } },
              },
            },
          },
        },
      },
    });
    return orders.map((o) => this.toView(o));
  }

  // ── helpers ──
  private toView(o: any): OrderViewDto {
    return {
      orderId: o.id,
      orderNo: o.orderNo,
      concertName: o.concert.name,
      status: o.status,
      paymentStatus: o.payment?.status ?? null,
      paymentFailCode: o.payment?.failCode ?? null,
      failReason: o.payment?.failCode
        ? (PAYMENT_FAIL_MESSAGES[o.payment.failCode as PaymentFailCode] ?? null)
        : null,
      amount: o.amount,
      items: o.items.map((it: any) => ({
        ticketId: it.ticketId,
        seatLabel: this.seatLabel(it.ticket.seat),
        grade: it.ticket.grade,
        price: it.unitPrice,
      })),
      createdAt: o.createdAt,
    };
  }

  private seatLabel(seat: { floor: string; section: string; seatRow: string; seatNo: number }) {
    if (seat.floor === 'FLOOR') return '스탠딩';
    return `${seat.floor} ${seat.section}구역 ${seat.seatRow}열 ${seat.seatNo}번`;
  }

  private newOrderNo() {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  private async runHold(
    concertId: string,
    userId: string,
    now: number,
    expiry: number,
    seatIds: string[],
  ): Promise<number> {
    const args = [String(now), String(expiry), userId, ...seatIds];
    try {
      return Number(
        await this.redis.evalsha(
          this.holdSha,
          2,
          this.holdsKey(concertId),
          this.ownerKey(concertId),
          ...args,
        ),
      );
    } catch (e) {
      if (String(e).includes('NOSCRIPT')) {
        this.holdSha = (await this.redis.script('LOAD', this.holdScript)) as string;
        return Number(
          await this.redis.evalsha(
            this.holdSha,
            2,
            this.holdsKey(concertId),
            this.ownerKey(concertId),
            ...args,
          ),
        );
      }
      throw e;
    }
  }
}
