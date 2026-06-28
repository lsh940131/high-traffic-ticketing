import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:3000';

// 티켓 오픈 스파이크: 30초간 0→5000 VU 급증
export const options = {
  scenarios: {
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5000 },
        { duration: '1m', target: 5000 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const userId = `u${__VU}-${__ITER}`;
  const headers = { 'x-user-id': userId };

  http.post(`${BASE}/queue/demo/enter`, null, { headers });
  // 입장될 때까지 폴링
  for (let i = 0; i < 5; i++) {
    const res = http.get(`${BASE}/queue/demo/status`, { headers });
    const body = res.json();
    check(res, { 'status 200': (r) => r.status === 200 });
    if (body.status === 'READY') break;
    sleep(2);
  }
}
