import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../libs/prisma/generated/prisma/client';

/**
 * 개발용 시드.
 *  - 공연장(venue) 2곳 + 물리 좌석(venue_seat)
 *  - 공연(concert) 10개 (좌석은 공연장 것을 재사용)
 *  - 티켓(ticket) = 공연 x 좌석, 전부 AVAILABLE. 가격은 "공연 x 등급"별.
 *  - 시드 유저 몇 명 (인증 도입 전까지 userId 소스)
 * 멱등: 재실행 시 관련 테이블을 FK 순서로 비우고 다시 넣는다.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

// 좌석 레이아웃 (튜너블): 3층 x 2구역 x 10열 x 12석 = 720석/공연장
const FLOORS = [1, 2, 3];
const SECTIONS = ['A', 'B'];
const ROWS = 10;
const SEATS_PER_ROW = 12;

type Grade = 'VIP' | 'R' | 'S';
type Prices = Record<Grade, number>;

const GRADE_BY_FLOOR: Record<number, Grade> = { 1: 'VIP', 2: 'R', 3: 'S' };

function seatRows(venueId: string) {
  const rows: {
    venueId: string;
    floor: string;
    section: string;
    seatRow: string;
    seatNo: number;
  }[] = [];
  for (const floor of FLOORS) {
    for (const section of SECTIONS) {
      for (let r = 1; r <= ROWS; r++) {
        for (let n = 1; n <= SEATS_PER_ROW; n++) {
          rows.push({ venueId, floor: `${floor}F`, section, seatRow: String(r), seatNo: n });
        }
      }
    }
  }
  return rows;
}

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const VENUES: {
  name: string;
  location: string;
  concerts: { name: string; artist: string; prices: Prices }[];
}[] = [
  {
    name: '인스파이어 아레나',
    location: '인천 중구 영종도',
    concerts: [
      {
        name: 'IU CONCERT : The Golden Hour',
        artist: '아이유',
        prices: { VIP: 220000, R: 170000, S: 120000 },
      },
      { name: 'AKMU FESTIVAL', artist: '악뮤', prices: { VIP: 150000, R: 120000, S: 90000 } },
      {
        name: 'NewJeans Fan Meeting',
        artist: '뉴진스',
        prices: { VIP: 180000, R: 140000, S: 100000 },
      },
      {
        name: 'SEVENTEEN WORLD TOUR',
        artist: '세븐틴',
        prices: { VIP: 200000, R: 160000, S: 110000 },
      },
      { name: 'IM HERO', artist: '임영웅', prices: { VIP: 250000, R: 190000, S: 130000 } },
    ],
  },
  {
    name: 'KSPO DOME',
    location: '서울 송파구 올림픽로',
    concerts: [
      {
        name: 'BTS WORLD TOUR in SEOUL',
        artist: 'BTS',
        prices: { VIP: 280000, R: 210000, S: 140000 },
      },
      {
        name: 'The ReVe Festival',
        artist: '레드벨벳',
        prices: { VIP: 170000, R: 130000, S: 95000 },
      },
      {
        name: 'BORN PINK FINALE',
        artist: '블랙핑크',
        prices: { VIP: 260000, R: 200000, S: 140000 },
      },
      { name: 'The Book of Us', artist: '데이식스', prices: { VIP: 140000, R: 110000, S: 85000 } },
      {
        name: '성시경 연말 콘서트',
        artist: '성시경',
        prices: { VIP: 160000, R: 130000, S: 100000 },
      },
    ],
  },
];

async function main() {
  await prisma.payment.deleteMany();
  await prisma.outbox.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.venueSeat.deleteMany();
  await prisma.concert.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { name: '테스트유저1', email: 'user1@ticketing.dev', passwordHash: 'seed-placeholder' },
      { name: '테스트유저2', email: 'user2@ticketing.dev', passwordHash: 'seed-placeholder' },
      { name: '테스트유저3', email: 'user3@ticketing.dev', passwordHash: 'seed-placeholder' },
    ],
  });

  let concertIdx = 0;
  for (const v of VENUES) {
    const venue = await prisma.venue.create({ data: { name: v.name, location: v.location } });

    await prisma.venueSeat.createMany({ data: seatRows(venue.id) });
    const seats = await prisma.venueSeat.findMany({ where: { venueId: venue.id } });

    for (const c of v.concerts) {
      const startsAt = days(14 + concertIdx * 5);
      const concert = await prisma.concert.create({
        data: {
          venueId: venue.id,
          name: c.name,
          artist: c.artist,
          opensAt: days(-1),
          startsAt,
          endsAt: startsAt, // 단일일 (시작일 = 종료일)
        },
      });
      concertIdx++;

      const tickets = seats.map((s) => {
        const grade = GRADE_BY_FLOOR[Number(s.floor.replace('F', ''))] ?? 'S';
        return {
          concertId: concert.id,
          seatId: s.id,
          grade,
          price: c.prices[grade],
          status: 'AVAILABLE' as const,
        };
      });
      await prisma.ticket.createMany({ data: tickets });

      console.log(`  ${venue.name} · ${concert.name} (${c.artist}): ticket ${tickets.length}장`);
    }
  }

  const counts = {
    venues: await prisma.venue.count(),
    seats: await prisma.venueSeat.count(),
    concerts: await prisma.concert.count(),
    tickets: await prisma.ticket.count(),
    users: await prisma.user.count(),
  };
  console.log('seed 완료:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
