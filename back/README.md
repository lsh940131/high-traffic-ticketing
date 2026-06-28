# ⚙️ back — NestJS (MSA)

NestJS **monorepo 모드**로 4개 마이크로서비스를 한 레포에 담는다. 공통 코드는 `libs/`로 공유.

## 서비스 (4개)
| 서비스 | 포트 | 책임 | 통신 |
|--------|------|------|------|
| **gateway** | 3000 | 단일 진입점, REST 프록시(BFF), 입장토큰 검증 | REST in/out |
| **queue-service** | 3101 | 전략①: Redis ZSET 가상 대기열, 입장토큰 발급 | REST |
| **reservation-service** | 3102 | 전략②③: 좌석 hold·재고 동시성(Lua)·Kafka produce, event 흡수 | REST + Kafka(pub) |
| **payment-service** | 3103 | 결제(PG mock), reservation.requested 소비·확정 | Kafka(sub) |

> event(카탈로그)는 처음엔 reservation-service에 흡수. 트래픽 커지면 5번째 서비스로 분리.

## 구조
```
back/
├── apps/
│   ├── gateway/                # REST 프록시
│   ├── queue-service/          # 대기열
│   ├── reservation-service/    # 예매 + inventory + event
│   └── payment-service/        # 결제 consumer
├── libs/
│   ├── contracts/  # Kafka 이벤트·DTO 계약 (모든 서비스 공유)
│   ├── redis/      # RedisModule (@app/redis)
│   ├── kafka/      # KafkaModule (@app/kafka)
│   └── common/     # EntryTokenGuard (@app/common)
├── prisma/
├── nest-cli.json   # monorepo projects
└── package.json
```

## 통신 방식
- **동기(REST)**: client → gateway → 각 서비스. NestJS HttpModule 프록시.
- **비동기(Kafka)**: reservation-service → `reservation.requested` → payment-service. 결제·DB I/O를 사용자 응답에서 분리(load leveling).
- 이벤트 스키마는 `libs/contracts`에 단일 정의 → 서비스 간 계약 일치.

## 실행 (로컬)
```bash
npm install
cp .env.example .env
# 인프라(redis/kafka/postgres)는 ../infra/docker 에서 먼저 기동
npm run start:all          # 4개 서비스 동시 기동(concurrently)
# 또는 개별: npm run start:gateway / start:queue / start:reservation / start:payment
```

## DB 전략
정석은 service별 DB 분리지만, 솔로 단순화로 Postgres 1개 + **스키마 분리**(catalog/orders)를 권장. 트레이드오프는 docs/ARCHITECTURE.md에 기록.
