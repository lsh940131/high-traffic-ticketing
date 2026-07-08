import { Injectable } from '@nestjs/common';
import { PrismaService, TicketStatus } from '@app/prisma';
import { ConcertListItemDto } from './dto';

/** 공연 카탈로그 읽기(홈 목록 등). reservation-service 소유. */
@Injectable()
export class ConcertService {
  constructor(private readonly prisma: PrismaService) {}

  /** 홈 공연 목록. 공연장명 + 최저가 + 잔여좌석 집계 포함. */
  async list(): Promise<ConcertListItemDto[]> {
    const concerts = await this.prisma.concert.findMany({
      where: { deletedAt: null },
      orderBy: { startsAt: 'asc' },
      include: { venue: { select: { name: true } } },
    });
    if (concerts.length === 0) return [];

    const ids = concerts.map((c) => c.id);
    // 집계는 티켓 테이블에서 한 번에: 최저가 + 잔여(AVAILABLE) 수
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
}
