// 수평 확장 곡선 측정 — "replica↑ → 처리량↑ · 지연↓"을 뽑기 위한 스크립트.
//
// 기존 두 스크립트와 목적이 다르다:
//   waiting-queue.js  ramping-vus + sleep(1) 폴링 → "스파이크에서 죽지 않는가" (VU 많고 RPS 적음)
//   reservation.js    constant-arrival-rate      → "오버셀 0인가" (RPS를 고정하므로 처리량 증가가 안 보임)
//   scale-out.js      constant-vus + think time 없음
//                     → 처리량 = VU / 지연. 파드를 늘리면 지연이 떨어지고 **RPS가 그만큼 올라간다.**
//                       VU가 고정이라 부하생성기(노트북) 메모리도 일정 = 측정이 흔들리지 않는다.
//
// 부하를 켜 둔 채 라이브로 스케일하며 Grafana 곡선을 읽는 용도:
//   kubectl -n ticketing scale deploy/gateway --replicas=4
//
// 재고를 소모하는 예매 경로가 아니라 **대기열 경로(enter→status)**를 때린다.
// 이유: 10분짜리 시연 내내 돌아야 하는데 예매는 1,000장 팔리면 끝나 버린다.
// 대기열은 VU마다 고정 userId를 재사용하므로 ZSET 크기도 VU 수로 수렴한다.
//
//   # 본 측정 (부하 고정 → 라이브 스케일)
//   k6 run -e BASE=http://<PC-IP>:30300 -e VUS=400 -e DURATION=10m scale-out.js
//
//   # 부하생성기 천장 찾기 (replica를 미리 최대로 올려둔 상태에서)
//   k6 run -e BASE=http://<PC-IP>:30300 -e MODE=calibrate -e VUS=1200 scale-out.js
import http from 'k6/http';
import { check } from 'k6';
import { BASE, mintAT, firstConcertId } from './common.js';

const MODE = __ENV.MODE || 'steady';
const VUS = Number(__ENV.VUS || 400);
const DURATION = __ENV.DURATION || '10m';

const steady = { executor: 'constant-vus', vus: VUS, duration: DURATION };
// calibrate: 0→VUS로 천천히 올리며 RPS가 어디서 평평해지는지 본다.
// 평평해질 때 Grafana의 서버 CPU가 **포화가 아니면** 노트북(k6)이 천장이라는 뜻.
const calibrate = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '30s', target: Math.round(VUS * 0.25) },
    { duration: '30s', target: Math.round(VUS * 0.5) },
    { duration: '30s', target: Math.round(VUS * 0.75) },
    { duration: '30s', target: VUS },
    { duration: '60s', target: VUS },
  ],
};

export const options = {
  // 응답 본문을 버려 부하생성기의 CPU·메모리를 아낀다(파싱 안 함 → 4코어 노트북의 천장을 높인다).
  // 여기선 상태코드만 보면 되므로 손해가 없다. setup의 /concerts만 responseType으로 예외 처리.
  discardResponseBodies: true,
  scenarios: { load: MODE === 'calibrate' ? calibrate : steady },
  thresholds: {
    // 스케일 전(2 replica)엔 넘칠 수 있다. 실패로 죽이지 않고 관찰만 하려면 --no-thresholds.
    'http_req_failed{name:enter}': ['rate<0.05'],
  },
};

export function setup() {
  return { concertId: firstConcertId() };
}

// VU당 1회 서명 후 재사용 — 서명 비용이 측정 대상이 아니고, 생성기 CPU를 서버로 돌린다.
let token;
export default function (data) {
  if (!token) token = mintAT(`svu-${__VU}`);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // think time 없음: VU가 쉬지 않고 왕복 → 지연이 줄면 그만큼 RPS가 올라간다.
  const enter = http.post(`${BASE}/queue/${data.concertId}/enter`, null, {
    ...auth,
    tags: { name: 'enter' },
  });
  check(enter, { 'enter 2xx': (r) => r.status >= 200 && r.status < 300 });

  const st = http.get(`${BASE}/queue/${data.concertId}/status`, {
    ...auth,
    tags: { name: 'status' },
  });
  check(st, { 'status 200': (r) => r.status === 200 });
}
