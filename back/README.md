# ⚙️ back — NestJS (MSA)

NestJS **monorepo 모드**로 5개 마이크로서비스를 한 레포에 담는다. 공통 코드는 `libs/`로 공유.

## 서비스 (5개)

| 서비스 | 포트 | 책임 | 통신 |
|--------|------|------|------|
| **gateway** | 3000 | 단일 진입점, REST 프록시(BFF), 토큰 검증, 안전장치 | REST in/out |
| **user-service** | 3104 | 회원가입·로그인, AT/RT 발급·회전 | REST |
| **queue-service** | 3101 | 전략①: Redis ZSET 가상 대기열, 입장토큰 발급 | REST |
| **reservation-service** | 3102 | 전략②③: 좌석 hold·재고 동시성(Lua)·Outbox 발행, 공연 카탈로그 | REST + Kafka(pub) |
| **payment-service** | 3103 | 결제(PG mock), `reservation.requested` 소비·확정 | Kafka(sub) |

**gateway 라우팅** — `/auth`→user · `/queue`→queue · `/reservations`·`/orders`·`/concerts`·`/events`→reservation.
와일드카드 `*` 대신 prefix만 바인딩해 게이트웨이 자신의 `/health`·`/metrics`·`/docs`를 삼키지 않는다.

## 구조

```
back/
├── apps/
│   ├── gateway/                # REST 프록시 + 안전장치
│   ├── user-service/           # 인증
│   ├── queue-service/          # 대기열
│   ├── reservation-service/    # 예매 + 재고 + 카탈로그
│   └── payment-service/        # 결제 consumer
├── libs/
│   ├── contracts/  # Kafka 토픽·이벤트·DTO 계약 (모든 서비스 공유)
│   ├── common/     # 공통 기반: 부트스트랩·가드·봉투·로깅·health·metrics
│   ├── config/     # 환경변수 스키마 검증 (기동 시 fail-fast)
│   ├── prisma/     # PrismaService + 생성된 클라이언트
│   ├── redis/      # RedisModule (@app/redis)
│   └── kafka/      # KafkaModule (@app/kafka)
├── init/           # seed.ts(시드) · e2e.ts(스모크 테스트)
├── prisma/         # schema.prisma + migrations
├── Dockerfile      # 5개 서비스 공통 (APP 빌드아규먼트로 선택)
├── nest-cli.json   # monorepo projects
└── package.json
```

## 횡단 관심사 — `CommonModule.forRoot(name)` 한 줄

각 서비스가 이 모듈 하나를 임포트하면 아래를 전부 얻는다. 서비스마다 재구현하지 않는다.

- **구조적 로깅** — `nestjs-pino` + request-id
- **`/health`** (Terminus) · **`/metrics`** (Prometheus, 기본 프로세스 지표 포함)
- **응답 봉투** — 성공은 인터셉터가 `{ success: true, data, meta }`, 실패는 전역 예외 필터가
  `{ success: false, error: { code, message }, meta }`로 감싼다. `meta`에 `requestId`가 실려 로그와 응답이 이어진다
- **부트스트랩** — `bootstrapService()`가 pino 연결·`ValidationPipe`·graceful shutdown·Swagger·listen을 일괄 처리.
  각 `main.ts`는 한 줄이다.
- **Swagger** — `/docs`. 문서 노출은 공격면이라 **운영에선 기본 off**(`SWAGGER_ENABLED`로 명시 제어).

**인증은 2단**이다. `JwtAuthGuard`가 액세스 토큰(누구인가)을, `EntryTokenGuard`가 대기열 입장 토큰
(지금 들어와도 되는가)을 본다. 둘 다 `libs/common`에 있고 경로마다 필요한 것만 건다 —
`hold`·예매는 **둘 다**, 좌석맵 조회는 입장 토큰만, 내 주문 조회는 액세스 토큰만.

## 통신 방식

- **동기(REST)** — client → gateway → 각 서비스.
- **비동기(Kafka)** — reservation → `reservation.requested` → payment.
  결제·DB I/O를 사용자 응답에서 분리한다(load leveling).
- **트랜잭셔널 아웃박스** — 예매 트랜잭션이 DB에 `Outbox` 행을 함께 커밋하고,
  `OutboxRelay`가 1초마다 PENDING을 Kafka로 발행 후 SENT로 표시한다.
  "DB 커밋"과 "이벤트 발행"을 하나의 원자 단위로 묶을 수 없어서 생기는 **dual-write 유실·유령 이벤트**를 막는다.
- 이벤트 스키마는 `libs/contracts`에 단일 정의 → 서비스 간 계약 일치.

### gateway 안전장치

다운스트림 장애가 게이트웨이를 타고 번지지 않게 네 겹을 둔다.

| 장치 | 목적 |
|---|---|
| 타임아웃 | 매달린 서비스가 게이트웨이 자원을 물지 않도록 1회 호출 상한 |
| 재시도 | 네트워크 오류·502/503/504만 지수 백오프+지터로 제한 재시도 |
| 서킷브레이커 | 특정 서비스가 계속 실패하면 회로를 열어 즉시 fallback(연쇄 장애 차단). target별로 분리 |
| **커넥션 풀 회전** | k8s Service는 L4라 커넥션 수립 시점에만 파드를 고른다. keep-alive와 겹치면 **스케일아웃한 파드가 트래픽을 못 받는다** → 풀에 수명을 줘 주기적으로 재분배 |

> 마지막 항목은 부하테스트로 발견한 실제 버그다(동일 파드 수에서 +41%).
> 배경과 수치는 [`../infra/loadtest/RESULTS.md`](../infra/loadtest/RESULTS.md).

## 데이터 모델

Postgres 1개, 마이그레이션 7개. 모델 10개를 도메인별로 묶으면:

- **인증** — `User` · `RefreshToken`
- **카탈로그** — `Venue` · `VenueSeat` · `Concert` · `Ticket`
- **주문** — `Order` · `Reservation` · `Payment`
- **메시징** — `Outbox`

좌석·주문 **상태 머신**과 오버셀 방어 설계는 [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)에 있다.

## 실행

```bash
npm install
cp .env.example .env

npm run dev                # 인프라(docker compose) 기동 + 5개 서비스 동시 실행
# 또는 나눠서
npm run infra:up           # redis·kafka·postgres 등
npm run start:all          # 5개 동시 (concurrently)
npm run start:gateway      # 개별: start:user / start:queue / start:reservation / start:payment
```

```bash
npx prisma migrate deploy  # 스키마 반영
npm run seed               # 공연·좌석·부하용 유저 시드 (MinIO에 포스터 업로드 포함)
npm run e2e                # 스모크: 등록→로그인→대기열→좌석맵→hold→예매→결과 폴링
```

### 컨테이너 빌드

5개 서비스가 **Dockerfile 하나**를 공유한다. 빌더 스테이지가 공통이라 레이어 캐시가 재사용된다.

```bash
docker build --build-arg APP=gateway -t ticketing-gateway:latest .
# APP=user-service | queue-service | reservation-service | payment-service
```

## DB 전략

정석은 서비스별 DB 분리지만, **솔로 프로젝트 단순화로 Postgres 1개를 공유**한다.
서비스 경계는 코드(모듈·계약)로만 지키고 물리 분리는 하지 않았다 — 분리 시점의 마이그레이션 비용을
감수하는 대신 지금의 운영·개발 복잡도를 줄인 선택이다.

트랜잭션 처리 방침(현재 plain Prisma)은 [`docs/transactions.md`](./docs/transactions.md)에 기록.

## 참고 문서

- [`docs/folder-structure.md`](./docs/folder-structure.md) — 디렉터리 배치 규칙
- [`docs/transactions.md`](./docs/transactions.md) — 트랜잭션 처리 방침
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — 시스템 설계 · 4대 트래픽 전략 · 상태 머신
- [`../infra/loadtest/RESULTS.md`](../infra/loadtest/RESULTS.md) — 부하테스트 결과(오버셀 0 · 수평 확장 곡선)
