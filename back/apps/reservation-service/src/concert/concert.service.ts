import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, TicketStatus } from '@app/prisma';
import { ConcertDetailDto, ConcertGradeDto, ConcertListItemDto } from './dto';

const GRADE_RANK: Record<string, number> = { VIP: 0, R: 1, S: 2 };

/** 공연 카탈로그 읽기(홈 목록·상세). reservation-service 소유. */
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

    // 등급별 가격(등급 내 동일)·전체 수, 그리고 잔여(AVAILABLE) 수를 각각 집계
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
}
