// 부하테스트 공용 헬퍼.
// 인증 모델: "이미 로그인된 사용자"를 시뮬레이션 — k6가 JWT_SECRET으로 AT를 직접 발급.
//   (실제 티켓팅과 동일: 사용자는 오픈 전 로그인, 오픈 순간엔 대기열/예매만. user-service
//    로그인 경로는 별도 검증됨. 로그인 스탬피드는 bcrypt 병목이라 측정 대상이 아님.)
// 예매 시엔 대기열 입장 토큰(x-entry-token)은 실제 대기열(enter)에서 받는다.
import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';
import { SharedArray } from 'k6/data';

export const BASE = __ENV.BASE || 'http://192.168.219.150:30300';
const SECRET = __ENV.JWT_SECRET || 'dev-notebook';

// 예매 FK(Order.userId)용 실제 유저 ID 풀 (seed된 load-* 유저, users.json).
export const USER_IDS = new SharedArray('userIds', () => JSON.parse(open('./users.json')));

// 로그인 AT(JWT, HS256)를 직접 서명 발급. sub이 곧 userId가 된다(JwtAuthGuard).
export function mintAT(sub, email) {
  const header = encoding.b64encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'rawurl');
  const now = Math.floor(Date.now() / 1000);
  const payload = encoding.b64encode(
    JSON.stringify({ sub, email: email || `${sub}@load.dev`, iat: now, exp: now + 3600 }),
    'rawurl',
  );
  const input = `${header}.${payload}`;
  const sig = crypto.hmac('sha256', SECRET, input, 'base64rawurl');
  return `${input}.${sig}`;
}

// 대상 공연 ID (setup에서 1회). -e CONCERT_INDEX=N 으로 공연 선택(테스트마다 독립 재고).
export function firstConcertId() {
  const idx = Number(__ENV.CONCERT_INDEX || 0);
  // responseType: 스크립트가 discardResponseBodies를 켠 경우에도 이 응답만은 본문이 필요하다.
  const res = http.get(`${BASE}/concerts`, { tags: { name: 'concerts' }, responseType: 'text' });
  return res.json().data[idx].id;
}

// 대기열 진입 → entryToken. 정원 여유면 enter가 즉시 발급, 혼잡하면 status 폴링.
// 입장 실패(EXPIRED/타임아웃) 시 null.
export function enterQueue(concertId, token, maxPolls = 10) {
  const auth = { Authorization: `Bearer ${token}` };
  const enter = http.post(`${BASE}/queue/${concertId}/enter`, null, {
    headers: auth,
    tags: { name: 'enter' },
  });
  check(enter, { 'enter 201': (r) => r.status === 201 });
  let d = enter.json().data;
  if (d && d.entryToken) return d.entryToken;

  for (let i = 0; i < maxPolls; i++) {
    sleep(1);
    const st = http.get(`${BASE}/queue/${concertId}/status`, {
      headers: auth,
      tags: { name: 'status' },
    });
    d = st.json().data;
    if (d && d.status === 'READY') return d.entryToken;
    if (!d || d.status === 'EXPIRED') return null;
  }
  return null;
}
