/**
 * e2e 스모크 테스트: 등록→로그인(AT)→대기열(ET)→좌석맵→hold→예매→결과 폴링.
 * AT/ET 매번 수동으로 따는 수고를 없앤다. 게이트웨이 경유(기본 http://localhost:3000).
 * 실행: npm run e2e   (선행: infra + 모든 서비스 기동 + 시드)
 */
const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? `e2e_${Date.now()}@ticketing.dev`; // 매 실행 새 유저(2매 제한 누적 방지)
const PW = 'password123';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(
  method: string,
  path: string,
  opts: { token?: string; entry?: string; body?: unknown } = {},
): Promise<any> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.entry) headers['x-entry-token'] = opts.entry;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json: any = await res.json().catch(() => ({}));
  const data = json && json.success ? json.data : json;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  // 1) 회원가입(있으면 무시) + 로그인
  await fetch(BASE + '/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'E2E', email: EMAIL, password: PW }),
  }).catch(() => undefined);
  const login = await api('POST', '/auth/login', { body: { email: EMAIL, password: PW } });
  const at: string = login.accessToken;
  console.log('1) 로그인 OK');

  // 2) 공연 목록 → 첫 공연
  const concerts = await api('GET', '/concerts');
  const concert = concerts[0];
  console.log(`2) 공연 선택: ${concert.name} (${concert.id})`);

  // 3) 대기열 입장 → READY까지
  let q = await api('POST', `/queue/${concert.id}/enter`, { token: at });
  for (let i = 0; i < 30 && q.status !== 'READY'; i++) {
    await sleep(1000);
    q = await api('GET', `/queue/${concert.id}/status`, { token: at });
  }
  if (q.status !== 'READY') throw new Error('대기열 READY 실패: ' + JSON.stringify(q));
  const et: string = q.entryToken;
  console.log('3) 대기열 READY, 입장 토큰 획득');

  // 4) 좌석맵 → 좌석 블록 → AVAILABLE 2석
  const map = await api('GET', `/concerts/${concert.id}/seatmap`, { token: at, entry: et });
  const block = map.blocks.find((b: any) => !b.standing && b.remaining >= 2);
  if (!block) throw new Error('가용 좌석 블록 없음');
  const blockSeats = await api('GET', `/concerts/${concert.id}/seats?block=${block.blockId}`, {
    token: at,
    entry: et,
  });
  const picks = blockSeats.seats.filter((s: any) => s.status === 'AVAILABLE').slice(0, 2);
  const ticketIds = picks.map((s: any) => s.ticketId);
  console.log(
    `4) 블록 ${block.blockId}(${block.grade}) 좌석 2석: ${picks.map((p: any) => `${p.row}열 ${p.seatNo}번`).join(', ')}`,
  );

  // 5) hold
  const hold = await api('POST', '/reservations/hold', {
    token: at,
    entry: et,
    body: { ticketIds },
  });
  console.log(`5) hold OK · 금액 ${hold.amount.toLocaleString()}원 · 만료 ${hold.expiresAt}`);

  // 6) reserve
  const order = await api('POST', '/reservations', { token: at, entry: et, body: { ticketIds } });
  console.log(`6) 예매 생성: ${order.orderNo} (${order.status})`);

  // 7) 주문 상태 폴링 (PENDING → CONFIRMED/FAILED)
  let o = await api('GET', `/orders/${order.orderId}`, { token: at });
  for (let i = 0; i < 20 && o.status === 'PENDING'; i++) {
    await sleep(500);
    o = await api('GET', `/orders/${order.orderId}`, { token: at });
  }
  console.log(
    `7) 최종: 주문 ${o.status} · 결제 ${o.paymentStatus} · 좌석 [${o.items.map((x: any) => x.seatLabel).join(', ')}]`,
  );
  // 실패면 카드 변경 가정하고 1회 재시도(좌석 hold 유지 → 가능)
  if (o.status === 'FAILED') {
    console.log(`   \u21bb 결제 실패(${o.failReason ?? ''}) → 카드 변경 가정 재시도`);
    await api('POST', `/orders/${order.orderId}/retry`, { token: at });
    o = await api('GET', `/orders/${order.orderId}`, { token: at });
    for (let i = 0; i < 20 && o.status === 'PENDING'; i++) {
      await sleep(500);
      o = await api('GET', `/orders/${order.orderId}`, { token: at });
    }
    console.log(`   재시도 결과: ${o.status}${o.failReason ? ' · ' + o.failReason : ''}`);
  }

  if (o.status === 'CONFIRMED') console.log('✅ 예매 사이클 성공');
  else console.log(`⚠️ 최종 상태: ${o.status}${o.failReason ? ' · ' + o.failReason : ''}`);
}

main().catch((e) => {
  console.error('❌ 실패:', e.message);
  process.exit(1);
});

export {};
