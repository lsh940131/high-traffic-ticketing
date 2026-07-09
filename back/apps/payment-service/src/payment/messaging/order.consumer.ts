import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA, ensureTopics } from '@app/kafka';
import { REDIS } from '@app/redis';
import { PrismaService, OrderStatus, PaymentStatus, TicketStatus } from '@app/prisma';
import { TOPICS, OrderRequested, PaymentFailCode } from '@app/contracts';
import { ChargeResult, PaymentService } from '../payment.service';

const MAX_ATTEMPTS = 3; // 일시적 실패(타임아웃) 재시도 횟수
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 전략③: order.requested 소비 → 결제 → 결과 DB 영속화.
 *  - 멱등: processed 마커(SET NX)로 중복 소비 방지.
 *  - 일시적 실패(TIMEOUT 등)는 서비스단에서 백오프 재시도로 회복 시도.
 *  - 성공: $transaction(티켓 SOLD 조건부[오버셀 2차] + Payment APPROVED + Order CONFIRMED) + hold 해제.
 *  - 실패: Payment FAILED(failCode) + Order FAILED + hold 해제(재고 복원).
 */
@Injectable()
export class OrderConsumer implements OnModuleInit {
  constructor(
    @Inject(KAFKA) private readonly kafka: Kafka,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly payment: PaymentService,
  ) {}

  async onModuleInit() {
    await ensureTopics(this.kafka, [TOPICS.ORDER_REQUESTED]);
    const consumer = this.kafka.consumer({ groupId: 'payment-workers' });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.ORDER_REQUESTED, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        await this.handle(JSON.parse(message.value!.toString()) as OrderRequested);
      },
    });
  }

  private async handle(evt: OrderRequested) {
    const fresh = await this.redis.set(`processed:order:${evt.orderId}`, '1', 'EX', 3600, 'NX');
    if (!fresh) return; // 멱등

    // 일시적 실패는 재시도(백오프). 단말 실패는 즉시 중단.
    let result: ChargeResult = { ok: false, code: 'TIMEOUT', retryable: true };
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      result = await this.payment.charge(evt.orderId, evt.amount);
      if (result.ok || !result.retryable) break;
      await sleep(150 * attempt);
    }

    if (result.ok) {
      try {
        await this.confirm(evt, result.txId);
        await this.releaseHolds(evt);
        return;
      } catch {
        // 확정 트랜잭션 실패(오버셀 등) → 실패 처리로 폴백
      }
    }

    // 결제 실패: 좌석 hold는 유지한다 — 사용자가 카드 바꿔 재시도 가능(POST /orders/:id/retry).
    // 포기하면 hold TTL 만료로 자연 해제된다.
    const failCode: PaymentFailCode = result.ok ? 'FRAUD_BLOCKED' : result.code;
    await this.fail(evt, failCode);
  }

  /** 성공 확정: 오버셀 2차 방어(SOLD 조건부) + Payment/Order 확정. */
  private confirm(evt: OrderRequested, txId: string) {
    return this.prisma.$transaction(async (tx) => {
      const upd = await tx.ticket.updateMany({
        where: { id: { in: evt.ticketIds }, status: { not: TicketStatus.SOLD } },
        data: { status: TicketStatus.SOLD },
      });
      if (upd.count !== evt.ticketIds.length) throw new Error('OVERSELL_DETECTED');
      await tx.payment.create({
        data: {
          orderId: evt.orderId,
          amount: evt.amount,
          status: PaymentStatus.APPROVED,
          txId,
        },
      });
      await tx.order.update({
        where: { id: evt.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });
    });
  }

  /** 실패 확정: Payment FAILED(failCode) + Order FAILED. */
  private fail(evt: OrderRequested, failCode: PaymentFailCode) {
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { orderId: evt.orderId },
        create: {
          orderId: evt.orderId,
          amount: evt.amount,
          status: PaymentStatus.FAILED,
          failCode,
        },
        update: { status: PaymentStatus.FAILED, failCode },
      });
      await tx.order.update({ where: { id: evt.orderId }, data: { status: OrderStatus.FAILED } });
    });
  }

  /** 성공 확정 후에만 Redis hold 정리(SOLD 확정 → hold 불필요). 실패 시엔 유지. */
  private async releaseHolds(evt: OrderRequested) {
    if (!evt.seatIds?.length) return;
    await Promise.all([
      this.redis.zrem(`holds:${evt.concertId}`, ...evt.seatIds),
      this.redis.hdel(`holds:${evt.concertId}:owner`, ...evt.seatIds),
    ]);
  }
}
