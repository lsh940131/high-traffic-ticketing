// 전략②③④: 오버셀 0 검증.
// 한정 스탠딩 재고(공연당 1000장)에 다수가 동시 예매 → 판매량이 재고를 절대
// 넘지 않는지(오버셀 0) 검증. Redis Lua 원자적 선점/차감이 방어선.
// 인증: 사전 발급 AT(실제 seed 유저 ID를 sub으로 → Order FK 충족) + 대기열 입장 토큰.
//
//   k6 run -e BASE=http://192.168.219.150:30300 reservation.js
//   -e BUYERS=1500  으로 동시 구매자 수 조절
// 실행 후 오버셀은 DB에서 확인: 판매(SOLD) 스탠딩 티켓 수 ≤ 1000 이어야 함.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import exec from 'k6/execution';
import { BASE, mintAT, firstConcertId, enterQueue, USER_IDS } from './common.js';

// 도착률 모델: 초당 RATE명이 DURATION 동안 몰림(티켓 오픈 재현). 총 시도 = RATE×DURATION.
// 재고(1000)보다 많이 쏘면 → ≈1000 판매 후 매진, 오버셀 0 을 확인.
const RATE = Number(__ENV.RATE || 150);
const DURATION = __ENV.DURATION || '25s';

const reserved = new Counter('reserved_ok'); // 예매 성공 수
const soldOut = new Counter('sold_out'); // 매진 거절 수

export const options = {
  scenarios: {
    buy: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: 400,
      maxVUs: 2500,
    },
  },
  thresholds: {
    'http_req_failed{name:reserve}': ['rate<0.01'],
  },
};

export function setup() {
  return { concertId: firstConcertId() };
}

export default function (data) {
  // 시도마다 서로 다른 실제 seed 유저로 AT 발급 (reserve의 Order.userId FK 충족)
  const userId = USER_IDS[exec.scenario.iterationInTest % USER_IDS.length];
  const token = mintAT(userId);

  // 대기열 통과 → 입장 토큰
  const entryToken = enterQueue(data.concertId, token);
  if (!entryToken) return; // 입장 실패(대기 타임아웃 등)

  const h = {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-entry-token': entryToken,
      'Content-Type': 'application/json',
    },
  };

  // 스탠딩 1매 원자적 선점
  const hold = http.post(`${BASE}/reservations/hold`, JSON.stringify({ standingQty: 1 }), {
    ...h,
    tags: { name: 'hold' },
  });
  if (hold.status !== 200) {
    soldOut.add(1); // 재고 소진 등으로 선점 실패
    return;
  }
  const ticketIds = hold.json().data.ticketIds;

  // 예매(주문) 확정
  const res = http.post(`${BASE}/reservations`, JSON.stringify({ ticketIds }), {
    ...h,
    tags: { name: 'reserve' },
  });
  const ok = check(res, { 'reserve 201': (r) => r.status === 201 });
  if (ok) reserved.add(1);
}
