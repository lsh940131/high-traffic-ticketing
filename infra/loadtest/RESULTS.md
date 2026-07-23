# 부하 테스트 결과 (dev / k3s 단일 노드)

티켓 오픈 스파이크를 재현해 **① 시스템이 죽지 않는가 ② 오버셀이 0인가**를 수치로 검증한다.
스크립트는 이 디렉터리의 `waiting-queue.js`(대기열)·`reservation.js`(예매/오버셀), 공용 헬퍼 `common.js`.

---

## 환경 · 방법론

```
[Windows PC 192.168.219.103]              [Linux 노트북 192.168.219.150]
  k6 v2.1.0 (부하 생성)  ──── LAN ────►     k3s 단일 노드 (4코어) · gateway NodePort :30300
  (부하 대상과 물리 분리 = 측정 오염 없음)     전체 스택(gateway·queue·reservation·payment·user
                                            + redis·postgres·kafka·minio)
```

- **대상 진입점**: `http://192.168.219.150:30300` (gateway, 단일 진입점 BFF).
- **인증 모델 — 사전 인증(pre-authenticated)**: k6가 `JWT_SECRET`으로 AT를 직접 서명 발급해
  "이미 로그인된 사용자"를 시뮬레이션한다. 실제 티켓팅과 동일(오픈 전 로그인, 오픈 순간엔 대기열·예매만).
  - 이유: 초기 3,000 스파이크에서 **실 로그인을 포함했더니 bcrypt(user-service)가 CPU 포화**되어
    대기열 측정을 오염시켰다. 로그인 경로 자체는 register/login 200으로 별도 검증됨.
- **시드 데이터**: 공연 10개(각 스탠딩 1,000장), 부하 유저 5,000명(`load-<i>@ticketing.dev`).
- **측정 도구**: k6 요약(p95/실패율/RPS) + `kubectl top`(서버측 CPU/메모리) + postgres 직접 쿼리(오버셀).

---

## 시나리오 ① 대기열 스파이크 (`waiting-queue.js`)

`ramping-vus`로 20s간 0→PEAK 급증 후 유지. 각 VU: 대기열 `enter` → `status` 폴링.

| PEAK VU | `enter` p95 | `enter` 실패율 | 판정 |
|--------:|------------:|---------------:|------|
| 10 (기준선) | **55 ms** | 0% | 여유 |
| 1,000 | 7.5 s | 16.7% | 저하 시작 |
| 3,000 | 60 s (타임아웃) | 39% | 포화 |

**피크 시 서버측(`kubectl top`, PEAK=3000):**

| 파드 | CPU | 해석 |
|------|----:|------|
| gateway ×2 | ~900m (한계 1 core 근접) | **프록시가 먼저 포화 = 병목** |
| queue-service ×2 | ~600m (여유) | **대기열 로직은 한가함** |
| user-service | 유휴 | 사전 인증이라 로그인 부하 없음 |
| **노드 전체** | **CPU 81% / 메모리 53%** | CPU가 벽, 메모리는 여유 |

> **핵심**: 부하는 gateway 프록시·노드 CPU에 걸리고 **가상 대기열(queue-service)은 여유** —
> 즉 대기열이 설계대로 뒷단을 보호한다. 단일 4코어 노드라 수천 동시성에서 프록시 계층이 먼저 포화.

---

## 시나리오 ② 오버셀 0 (`reservation.js`)

`constant-arrival-rate`(초당 N명 도착)로 한정 스탠딩 재고(1,000)에 예매를 몰아붙인다.
흐름: 사전 AT → 대기열 `enter`(입장 토큰) → `hold`(스탠딩 원자 선점) → `reserve`(주문).

### 🔍 부하테스트가 발견한 버그 → 수정

- **증상**: 고동시성에서 재고가 남아도 대부분 "매진/혼잡"(409)으로 거절, 판매 극소수.
- **원인**: `holdStanding`이 AVAILABLE 티켓 **첫 31개(`take: qty+30`)만** 조회. hold은 Redis에만
  기록(티켓 `status`는 AVAILABLE 유지) → 매 조회가 **같은 31개**를 반환 → 그 31개가 hold되면
  이후 전원 "매진". **동시 스탠딩 선점이 ~31에서 천장.** (저동시성 스모크에선 안 드러남)
- **수정**(`booking.service.ts` `holdStanding`): 후보창 확대(`max(qty*50, 300)`) + 무작위 구간(skip)
  + Fisher-Yates 셔플 → 동시 구매자가 서로 다른 좌석 선택. 스탠딩은 fungible이라 무작위 안전.
- **효과**: Redis 동시 hold **21 → 934** 로 개선.

### ✅ 오버셀 검증 (권위 지표 = `ticket.status`)

> 오버셀 방어는 **2층**: ① Redis Lua 원자 hold(동일 좌석 동시 점유 차단) ②
> 결제 시 `ticket.status` **원자적 조건부 UPDATE**(단 1건만 SOLD). Reservation 행은 취소·재판매를
> 위해 유니크를 두지 않으므로(경합 시 PENDING 중복 가능), **오버셀은 `SOLD` 수로 판정**한다.

| 테스트 | 조건 | SOLD | CONFIRMED | FAILED(경합 패자) | **이중 CONFIRMED** |
|--------|------|-----:|----------:|-----------------:|:------------------:|
| ⓐ 대기열 게이팅 | 정원 1,000 · 40/s | 392 | 392 | 110 | **0** |
| ⓑ 직접 경합 | 정원 5,000(게이팅 X) · 60/s | 296 | 296 | 70 | **0** |

- **오버셀 0** — 어떤 티켓도 2개 이상의 CONFIRMED 주문에 팔리지 않음. 재고(1,000) 초과 없음.
- **FAILED 주문 = 2차 방어선 작동 증거**: 같은 좌석을 경합한 패자는 결제 시 `status` UPDATE가 0행
  → 주문 FAILED로 **우아하게 실패**(크래시·오버셀 없음).
- ⓑ는 **대기열 보호를 제거**하고 재고에 직접 몰아도 오버셀 0 → **재고 방어선 자체가 정합성을 보장**함을 증명.
- (SOLD가 재고보다 적은 것은 노드 CPU 포화·hold 혼잡으로 인한 완결률 저하 때문이며, 안전성 증명과 무관.)

---

## 결론

1. **오버셀 0 — 증명됨** (대기열 게이팅 유무와 무관). 정합성은 코어 수가 아닌 원자적 방어의 문제라 하드웨어 독립적.
2. **가상 대기열이 뒷단을 보호** — 대기열 로직은 저비용(여유), 부하는 진입/프록시 계층에 걸림.
3. **부하테스트가 실제 동시성 버그를 발견·수정·재검증** (`holdStanding` 후보창 붕괴 → 넓힘+무작위화).
4. **양대 오버셀 방어선 모두 검증** — Lua 원자 hold(1차) + `ticket.status` 원자 UPDATE(2차).

### 한계 (의도된 스코프)
- **단일 4코어 노드**: Node.js는 프로세스당 싱글스레드(1 pod ≈ 1 core)라, 노드 코어가 이미 다 쓰이면
  replica를 늘려도 **같은 CPU를 나눠 경쟁**할 뿐이다. 따라서 **"replica↑ → 처리량↑" 수평 확장 시연은
  이 노드로 불가** → 물리 CPU를 늘리는 **멀티노드/클라우드(EKS + 노드 오토스케일)** 영역(runbook에서 defer).
- **메모리는 병목 아님**(피크 ~53%). 제약은 CPU(코어 수).

---

## 재현

```bash
# 대기열 스파이크 (PEAK 조절)
k6 run -e BASE=http://192.168.219.150:30300 -e PEAK=3000 waiting-queue.js

# 오버셀 — 도착률 모델. CONCERT_INDEX로 독립 재고 공연 선택(테스트마다 다른 공연).
k6 run -e BASE=http://192.168.219.150:30300 -e CONCERT_INDEX=8 -e RATE=40 -e DURATION=30s reservation.js

# 오버셀 검증 (SOLD ≤ 재고, 이중 CONFIRMED = 0)
#   kubectl -n ticketing exec <postgres> -- psql -U ticket -d ticketing -c \
#   "SELECT status, COUNT(*) FROM tickets WHERE \"concertId\"='<CID>' AND grade='STANDING' GROUP BY status;"
```

- 사전 인증: k6가 `JWT_SECRET`(기본 `dev-notebook`)으로 AT 서명. 예매는 실제 유저 ID 풀 `users.json` 사용.
- 정원 임시 상향(ⓑ): `kubectl -n ticketing set env deploy/queue-service QUEUE_ACTIVE_CAPACITY=5000` (원복: `...CAPACITY-`).
