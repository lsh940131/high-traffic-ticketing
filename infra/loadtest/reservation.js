import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:3000';

// 한정 좌석에 동시 예매 → 오버셀 0 검증용
export const options = {
  vus: 1000,
  iterations: 1000,
};

export default function () {
  const seatId = `S${__ITER % 100}`; // 100석 한정
  const res = http.post(
    `${BASE}/reservations`,
    JSON.stringify({ eventId: 'demo', seatId, userId: `u${__VU}` }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { 'accepted 202': (r) => r.status === 202 });
}
