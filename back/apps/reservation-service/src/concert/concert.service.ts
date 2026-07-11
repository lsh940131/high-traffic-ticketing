import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '@app/redis';
import { PrismaService, TicketStatus } from '@app/prisma';
import {
  BlockSeatsDto,
  ConcertDetailDto,
  ConcertGradeDto,
  ConcertListItemDto,
  SeatBlockDto,
  SeatDto,
  SeatMapDto,
} from './dto';

// 등급 표시 순서 (스탠딩 > R > S > A)
const GRADE_RANK: Record<string, number> = { STANDING: 0, R: 1, S: 2, A: 3 };
// 블록 정렬용 층 순서 (스탠딩 먼저 → 1층 → 2층 → 3층)
const FLOOR_RANK: Record<string, number> = { FLOOR: 0, '1F': 1, '2F': 2, '3F': 3 };
const STANDING_FLOOR = 'FLOOR';

/** 공연 카탈로그 읽기(목록·상세·좌석맵). reservation-service 소유. */
@Injectable()
export class ConcertService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  // Redis 임시 점유(HELD): ZSET member=seatId, score=만료 ms. hold API가 여기에 쓴다.
  private holdsKey = (concertId: string) => `holds:${concertId}`;

  /** 홈 공연 목록. 공연장명 + 최저가 + 잔여좌석 집계 포함. */
  async list(): Promise<ConcertListItemDto[]> {
    const concerts = await this.prisma.concert.findMany({
      where: { deletedAt: null },
      orderBy: { startsAt: 'asc' },
      include: { venue: { select: { name: true } } },
    });
    if (concerts.length === 0) return [];

    const ids = concerts.map((c) => c.id);
    const [minPrices, remainings] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['concertId'],
        where: { concertId: { in: ids } },
        _min: { price: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['concertId'],
        where: { concertId: { in: ids }, status: TicketStatus.AVAILABLE },
        _count: { _all: true },
      }),
    ]);
    const minMap = new Map(minPrices.map((m) => [m.concertId, m._min.price]));
    const remMap = new Map(remainings.map((r) => [r.concertId, r._count._all]));

    return concerts.map((c) => {
      const remaining = remMap.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        artist: c.artist,
        venueName: c.venue.name,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        opensAt: c.opensAt,
        posterUrl: c.posterUrl,
        minPrice: minMap.get(c.id) ?? null,
        remaining,
        soldOut: remaining === 0,
      };
    });
  }

  /** 공연 상세. 상세 이미지 + 등급별 가격/잔여. 없으면 404. */
  async detail(id: string): Promise<ConcertDetailDto> {
    const c = await this.prisma.concert.findFirst({
      where: { id, deletedAt: null },
      include: { venue: { select: { name: true, location: true } } },
    });
    if (!c) throw new NotFoundException('공연을 찾을 수 없습니다.');

    const [byGrade, availByGrade] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['grade'],
        where: { concertId: id },
        _min: { price: true },
        _count: { _all: true },
      }),
      this.prisma.ticket.groupBy({
        by: ['grade'],
        where: { concertId: id, status: TicketStatus.AVAILABLE },
        _count: { _all: true },
      }),
    ]);
    const availMap = new Map(availByGrade.map((g) => [g.grade, g._count._all]));

    const grades: ConcertGradeDto[] = byGrade
      .map((g) => ({
        grade: g.grade,
        price: g._min.price ?? 0,
        total: g._count._all,
        remaining: availMap.get(g.grade) ?? 0,
      }))
      .sort((a, b) => (GRADE_RANK[a.grade] ?? 99) - (GRADE_RANK[b.grade] ?? 99));

    const remaining = grades.reduce((sum, g) => sum + g.remaining, 0);

    return {
      id: c.id,
      name: c.name,
      artist: c.artist,
      venueName: c.venue.name,
      venueLocation: c.venue.location,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      opensAt: c.opensAt,
      posterUrl: c.posterUrl,
      detailImages: c.detailImages,
      ageLimit: c.ageLimit,
      notice: c.notice,
      grades,
      remaining,
      soldOut: remaining === 0,
    };
  }

  /**
   * 좌석맵 요약(진입 1회). 블록(section)별 잔여 + 등급 요약.
   * FLOOR 스탠딩 블록은 standing=true(그리드 없이 수량). 개별 좌석은 blockSeats로 on-demand.
   */
  async seatmap(concertId: string): Promise<SeatMapDto> {
    const concert = await this.prisma.concert.findFirst({
      where: { id: concertId, deletedAt: null },
      include: { venue: { select: { name: true } } },
    });
    if (!concert) throw new NotFoundException('공연을 찾을 수 없습니다.');

    const [tickets, held] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { concertId, deletedAt: null },
        include: { seat: { select: { floor: true, section: true } } },
      }),
      this.redis.zrangebyscore(this.holdsKey(concertId), Date.now(), '+inf'),
    ]);
    const heldSet = new Set(held);

    const blockMap = new Map<string, SeatBlockDto>();
    const gradeMap = new Map<string, ConcertGradeDto>();
    for (const t of tickets) {
      const { floor, section } = t.seat;
      const available = t.status !== TicketStatus.SOLD && !heldSet.has(t.seatId);

      const b =
        blockMap.get(section) ??
        ({
          blockId: section,
          floor,
          grade: t.grade,
          price: t.price,
          total: 0,
          remaining: 0,
          standing: floor === STANDING_FLOOR,
        } as SeatBlockDto);
      b.total += 1;
      if (available) b.remaining += 1;
      blockMap.set(section, b);

      const g = gradeMap.get(t.grade) ?? { grade: t.grade, price: t.price, total: 0, remaining: 0 };
      g.total += 1;
      if (available) g.remaining += 1;
      gradeMap.set(t.grade, g);
    }

    const blocks = [...blockMap.values()].sort(
      (a, b) =>
        (FLOOR_RANK[a.floor] ?? 9) - (FLOOR_RANK[b.floor] ?? 9) ||
        a.blockId.localeCompare(b.blockId),
    );
    const grades = [...gradeMap.values()].sort(
      (a, b) => (GRADE_RANK[a.grade] ?? 99) - (GRADE_RANK[b.grade] ?? 99),
    );
    return { concertId, venueName: concert.venue.name, blocks, grades };
  }

  /** 스탠딩 수량 요약(좌석 그리드 없음). total/remaining만. */
  private async standingSummary(concertId: string): Promise<BlockSeatsDto> {
    const held = await this.redis.zrangebyscore(this.holdsKey(concertId), Date.now(), '+inf');
    const [sample, total, sold, heldStanding] = await Promise.all([
      this.prisma.ticket.findFirst({
        where: { concertId, grade: 'STANDING' },
        select: { price: true },
      }),
      this.prisma.ticket.count({ where: { concertId, grade: 'STANDING' } }),
      this.prisma.ticket.count({
        where: { concertId, grade: 'STANDING', status: TicketStatus.SOLD },
      }),
      held.length
        ? this.prisma.ticket.count({
            where: {
              concertId,
              grade: 'STANDING',
              seatId: { in: held },
              status: { not: TicketStatus.SOLD },
            },
          })
        : Promise.resolve(0),
    ]);
    if (!sample) throw new NotFoundException('해당 블록을 찾을 수 없습니다.');
    return {
      concertId,
      blockId: 'STANDING',
      grade: 'STANDING',
      price: sample.price,
      total,
      remaining: total - sold - heldStanding,
      standing: true,
      seats: [],
    };
  }

  /** 블록 좌석(블록 클릭 시). 그 블록 좌석 + 실시간 상태(DB+Redis 병합). */
  async blockSeats(concertId: string, blockId: string): Promise<BlockSeatsDto> {
    if (!blockId) throw new BadRequestException('block 파라미터가 필요합니다. 예: 103');

    const exists = await this.prisma.concert.findFirst({
      where: { id: concertId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('공연을 찾을 수 없습니다.');

    // 스탠딩 블록은 좌석 그리드가 없다(수량 예매). 1000행 반환 대신 수량 요약만.
    if (blockId === 'STANDING') return this.standingSummary(concertId);

    const [tickets, held] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { concertId, deletedAt: null, seat: { section: blockId } },
        include: {
          seat: { select: { floor: true, section: true, seatRow: true, seatNo: true } },
        },
      }),
      this.redis.zrangebyscore(this.holdsKey(concertId), Date.now(), '+inf'),
    ]);
    if (tickets.length === 0) throw new NotFoundException('해당 블록을 찾을 수 없습니다.');
    const heldSet = new Set(held);

    const seats: SeatDto[] = tickets
      .map((t) => ({
        ticketId: t.id,
        seatId: t.seatId,
        floor: t.seat.floor,
        section: t.seat.section,
        row: t.seat.seatRow,
        seatNo: t.seat.seatNo,
        grade: t.grade,
        price: t.price,
        status: (t.status === TicketStatus.SOLD
          ? 'SOLD'
          : heldSet.has(t.seatId)
            ? 'HELD'
            : 'AVAILABLE') as SeatDto['status'],
      }))
      .sort((a, b) => Number(a.row) - Number(b.row) || a.seatNo - b.seatNo);

    const remaining = seats.filter((s) => s.status === 'AVAILABLE').length;
    return {
      concertId,
      blockId,
      grade: seats[0].grade,
      price: seats[0].price,
      total: seats.length,
      remaining,
      standing: seats[0].floor === STANDING_FLOOR,
      seats,
    };
  }
}
