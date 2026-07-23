// 전략①: 가상 대기열 스파이크 테스트.
// 티켓 오픈 순간 다수가 몰릴 때, 대기열이 정원(capacity)만 입장시키고 나머지는
// WAITING으로 버티며 죽지 않는지 검증.
// 인증: 사전 발급 AT(이미 로그인된 사용자). 대기열 userId는 Redis 문자열 키라 FK 불필요.
//
//   k6 run -e BASE=http://192.168.219.150:30300 waiting-queue.js
//   -e PEAK=3000  으로 최대 VU 조절
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE, mintAT, firstConcertId } from './common.js';

const PEAK = Number(__ENV.PEAK || 2000);

export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: PEAK }, // 급증
        { duration: '40s', target: PEAK }, // 유지
        { duration: '10s', target: 0 }, // 감소
      ],
    },
  },
  thresholds: {
    'http_req_failed{name:enter}': ['rate<0.01'],
    'http_req_duration{name:enter}': ['p(95)<800'],
    'http_req_duration{name:status}': ['p(95)<800'],
  },
};

export function setup() {
  return { concertId: firstConcertId() };
}

let token; // VU별 1회 발급(캐시)
export default function (data) {
  if (!token) token = mintAT(`qvu-${__VU}`); // VU별 고유 사용자
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // 대기열 진입
  const enter = http.post(`${BASE}/queue/${data.concertId}/enter`, null, {
    ...auth,
    tags: { name: 'enter' },
  });
  check(enter, { 'enter 201': (r) => r.status === 201 });

  // 프론트 폴링 재현: READY 될 때까지 최대 5회 status 조회
  for (let i = 0; i < 5; i++) {
    const st = http.get(`${BASE}/queue/${data.concertId}/status`, {
      ...auth,
      tags: { name: 'status' },
    });
    check(st, { 'status 200': (r) => r.status === 200 });
    if (st.json().data.status === 'READY') break;
    sleep(1);
  }
}
