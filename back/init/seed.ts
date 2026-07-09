import 'dotenv/config';
import { join } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../libs/prisma/generated/prisma/client';
import { uploadConcertImages } from './minio';

/**
 * 개발용 시드 (초기화).
 *  - 공연장(venue) 2곳 + 물리 좌석(venue_seat)
 *  - 공연(concert) 10개 (좌석은 공연장 것을 재사용)
 *  - 각 공연 이미지(poster/detail)를 MinIO에 업로드 → posterUrl/detailImages 저장
 *  - 티켓(ticket) = 공연 x 좌석, 전부 AVAILABLE. 가격은 "공연 x 등급"별.
 *  - 시드 유저 몇 명 (인증 도입 전까지 userId 소스)
 * 멱등: 재실행 시 관련 테이블을 FK 순서로 비우고 다시 넣는다. 이미지도 같은 키로 덮어씀.
 * 선행조건: infra(postgres+minio) 기동. `npm run seed`.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const ASSETS_DIR = join(__dirname, 'assets');

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

// slug: MinIO 키/URL용 ascii. assetKey: init/assets 로컬 파일명 접두어(한글 그대로).
const VENUES: {
  name: string;
  location: string;
  concerts: { name: string; artist: string; slug: string; assetKey: string; prices: Prices }[];
}[] = [
  {
    name: '인스파이어 아레나',
    location: '인천 중구 영종도',
    concerts: [
      {
        name: '실리카겔 단독공연',
        artist: '실리카겔',
        slug: 'silicagel',
        assetKey: '실리카겔',
        prices: { VIP: 220000, R: 170000, S: 120000 },
      },
      {
        name: '쏜애플 단독공연',
        artist: '쏜애플',
        slug: 'thornapple',
        assetKey: '쏜애플',
        prices: { VIP: 150000, R: 120000, S: 90000 },
      },
      {
        name: '너드커넥션 단독공연',
        artist: '너드커넥션',
        slug: 'nerdconnection',
        assetKey: '너드커넥션',
        prices: { VIP: 180000, R: 140000, S: 100000 },
      },
      {
        name: '터치드 단독공연',
        artist: '터치드',
        slug: 'touched',
        assetKey: '터치드',
        prices: { VIP: 200000, R: 160000, S: 110000 },
      },
      {
        name: '레이니 단독공연',
        artist: '레이니',
        slug: 'rainey',
        assetKey: '레이니',
        prices: { VIP: 250000, R: 190000, S: 130000 },
      },
    ],
  },
  {
    name: 'KSPO DOME',
    location: '서울 송파구 올림픽로',
    concerts: [
      {
        name: '김종국 단독공연',
        artist: '김종국',
        slug: 'kimjongkook',
        assetKey: '김종국',
        prices: { VIP: 280000, R: 210000, S: 140000 },
      },
      {
        name: 'FT아일랜드 단독공연',
        artist: 'FT아일랜드',
        slug: 'ftisland',
        assetKey: 'ft아일랜드',
        prices: { VIP: 170000, R: 130000, S: 95000 },
      },
      {
        name: 'B1A4 단독공연',
        artist: 'B1A4',
        slug: 'b1a4',
        assetKey: 'b1a4',
        prices: { VIP: 260000, R: 200000, S: 140000 },
      },
      {
        name: '제이슨 므라즈 내한공연',
        artist: '제이슨 므라즈',
        slug: 'jasonmraz',
        assetKey: '제이슨므라즈',
        prices: { VIP: 140000, R: 110000, S: 85000 },
      },
      {
        name: '장경민 단독공연',
        artist: '장경민',
        slug: 'jangkyungmin',
        assetKey: '장경민',
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
      // 이미지 업로드 → URL 확보 후 공연 생성
      const { posterUrl, detailImages } = await uploadConcertImages(ASSETS_DIR, c.slug, c.assetKey);

      const startsAt = days(14 + concertIdx * 5);
      const concert = await prisma.concert.create({
        data: {
          venueId: venue.id,
          name: c.name,
          artist: c.artist,
          opensAt: days(-1),
          startsAt,
          endsAt: startsAt, // 단일일 (시작일 = 종료일)
          posterUrl,
          detailImages,
          ageLimit: '만 7세 이상', // 데모 기본값
          notice: '무통장입금 결제 불가 · 예매 취소/환불은 관람일 기준 규정에 따릅니다.', // 데모 기본값
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

      console.log(
        `  ${venue.name} · ${concert.name} (${c.artist}): 티켓 ${tickets.length}장, 상세 ${detailImages.length}장`,
      );
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
