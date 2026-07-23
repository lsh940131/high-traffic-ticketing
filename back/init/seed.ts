import 'dotenv/config';
import { join } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../libs/prisma/generated/prisma/client';
import { uploadConcertImages } from './minio';
import * as bcrypt from 'bcryptjs';

/**
 * 개발용 시드 (초기화).
 *  - 공연장(venue) 2곳 + 물리 좌석(venue_seat) — 좌석선택 UI 레이아웃(공통):
 *      FLOOR 스탠딩(좌석X, 수량만) + 1층 R(블록 101~106) + 2층 S(201~208) + 3층 A(301~308)
 *      각 블록 5열 x 12석 = 60석. section 필드에 블록번호("103") 또는 "STANDING" 저장.
 *  - 공연(concert) 10개 + 이미지(MinIO) → posterUrl/detailImages
 *  - 티켓(ticket) = 공연 x 좌석. 스탠딩은 N개의 수량 단위 티켓(오버셀 방어 모델 유지).
 *  - 시드 유저 몇 명
 * 멱등: 재실행 시 관련 테이블을 FK 순서로 비우고 다시 넣는다.
 * 선행조건: infra(postgres+minio) 기동. `npm run seed`.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

const ASSETS_DIR = join(__dirname, 'assets');

// ── 좌석 레이아웃 (공연장 공통, 좌석선택 목업 기준) ──
const STANDING_CAPACITY = 1000; // FLOOR 스탠딩 총 매수
const ROWS_PER_BLOCK = 5;
const SEATS_PER_ROW = 12;

type Grade = 'STANDING' | 'R' | 'S' | 'A';
type Prices = Record<Grade, number>;

// 층별 등급 + 블록 번호
const SEATED_FLOORS: { floor: string; grade: Grade; blocks: string[] }[] = [
  { floor: '1F', grade: 'R', blocks: ['101', '102', '103', '104', '105', '106'] },
  { floor: '2F', grade: 'S', blocks: ['201', '202', '203', '204', '205', '206', '207', '208'] },
  { floor: '3F', grade: 'A', blocks: ['301', '302', '303', '304', '305', '306', '307', '308'] },
];

// 좌석 등급: FLOOR=스탠딩, 그 외 층별 등급
function gradeOfFloor(floor: string): Grade {
  return SEATED_FLOORS.find((f) => f.floor === floor)?.grade ?? 'STANDING';
}

// 공연장 물리 좌석 생성
function venueSeatRows(venueId: string) {
  const rows: {
    venueId: string;
    floor: string;
    section: string;
    seatRow: string;
    seatNo: number;
  }[] = [];
  // FLOOR 스탠딩: 좌석 그리드 없이 수량만 → 내부적으로 N개의 스탠딩 단위
  for (let n = 1; n <= STANDING_CAPACITY; n++) {
    rows.push({ venueId, floor: 'FLOOR', section: 'STANDING', seatRow: 'S', seatNo: n });
  }
  // 층 → 블록 → 열 → 번호
  for (const f of SEATED_FLOORS) {
    for (const block of f.blocks) {
      for (let r = 1; r <= ROWS_PER_BLOCK; r++) {
        for (let s = 1; s <= SEATS_PER_ROW; s++) {
          rows.push({ venueId, floor: f.floor, section: block, seatRow: String(r), seatNo: s });
        }
      }
    }
  }
  return rows;
}

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// slug: MinIO 키/URL용 ascii. assetKey: init/assets 로컬 파일명 접두어(한글 그대로).
// prices: 4등급(STANDING > R > S > A).
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
        prices: { STANDING: 154000, R: 143000, S: 132000, A: 110000 },
      },
      {
        name: '쏜애플 단독공연',
        artist: '쏜애플',
        slug: 'thornapple',
        assetKey: '쏜애플',
        prices: { STANDING: 130000, R: 120000, S: 108000, A: 90000 },
      },
      {
        name: '너드커넥션 단독공연',
        artist: '너드커넥션',
        slug: 'nerdconnection',
        assetKey: '너드커넥션',
        prices: { STANDING: 140000, R: 128000, S: 115000, A: 99000 },
      },
      {
        name: '터치드 단독공연',
        artist: '터치드',
        slug: 'touched',
        assetKey: '터치드',
        prices: { STANDING: 120000, R: 110000, S: 98000, A: 85000 },
      },
      {
        name: '레이니 단독공연',
        artist: '레이니',
        slug: 'rainey',
        assetKey: '레이니',
        prices: { STANDING: 150000, R: 138000, S: 124000, A: 105000 },
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
        prices: { STANDING: 165000, R: 150000, S: 135000, A: 115000 },
      },
      {
        name: 'FT아일랜드 단독공연',
        artist: 'FT아일랜드',
        slug: 'ftisland',
        assetKey: 'ft아일랜드',
        prices: { STANDING: 145000, R: 133000, S: 120000, A: 100000 },
      },
      {
        name: 'B1A4 단독공연',
        artist: 'B1A4',
        slug: 'b1a4',
        assetKey: 'b1a4',
        prices: { STANDING: 150000, R: 138000, S: 124000, A: 105000 },
      },
      {
        name: '제이슨 므라즈 내한공연',
        artist: '제이슨 므라즈',
        slug: 'jasonmraz',
        assetKey: '제이슨므라즈',
        prices: { STANDING: 135000, R: 123000, S: 110000, A: 92000 },
      },
      {
        name: '장경민 단독공연',
        artist: '장경민',
        slug: 'jangkyungmin',
        assetKey: '장경민',
        prices: { STANDING: 128000, R: 118000, S: 104000, A: 88000 },
      },
    ],
  },
];

async function main() {
  // FK 순서로 삭제: payment/reservation → order → ticket → venueSeat/concert → venue/user
  await prisma.payment.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.outbox.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.venueSeat.deleteMany();
  await prisma.concert.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // 부하테스트용 유저: 전원 같은 비밀번호 → bcrypt 해시를 1번만 만들어 공유(대량 생성 시 해시 비용 절감).
  //   로그인: email=load-<i>@ticketing.dev, password=LOADTEST_PASSWORD
  const LOADTEST_USERS = Number(process.env.LOADTEST_USERS ?? 5000);
  const LOADTEST_PASSWORD = process.env.LOADTEST_PASSWORD ?? 'loadtest1234';
  const sharedHash = await bcrypt.hash(LOADTEST_PASSWORD, 10);
  const users = [
    { name: '테스트유저1', email: 'user1@ticketing.dev', passwordHash: sharedHash },
    { name: '테스트유저2', email: 'user2@ticketing.dev', passwordHash: sharedHash },
    { name: '테스트유저3', email: 'user3@ticketing.dev', passwordHash: sharedHash },
  ];
  for (let i = 0; i < LOADTEST_USERS; i++) {
    users.push({
      name: `부하유저${i}`,
      email: `load-${i}@ticketing.dev`,
      passwordHash: sharedHash,
    });
  }
  await prisma.user.createMany({ data: users });

  let concertIdx = 0;
  for (const v of VENUES) {
    const venue = await prisma.venue.create({ data: { name: v.name, location: v.location } });

    await prisma.venueSeat.createMany({ data: venueSeatRows(venue.id) });
    const seats = await prisma.venueSeat.findMany({ where: { venueId: venue.id } });

    for (const c of v.concerts) {
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
        const grade = gradeOfFloor(s.floor);
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
        `  ${venue.name} · ${concert.name} (${c.artist}): 티켓 ${tickets.length}장 (스탠딩 ${STANDING_CAPACITY} 포함), 상세 ${detailImages.length}장`,
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
