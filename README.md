# 🎟️ High-Traffic Ticketing

대규모 트래픽(콘서트·공연 티켓 오픈)을 견디는 티케팅 시스템 **솔로 포트폴리오 프로젝트**.
한 레포에 기획(figma) · 프론트(React) · 백엔드(NestJS) · 인프라(K8s)를 모두 담아,
이력서에 링크 하나로 어필할 수 있게 구성했습니다.

> 핵심 도전: "10만 명이 동시에 '예매하기'를 누르면 어떻게 시스템이 안 죽고, 재고는 정확히 맞고,
> 사용자는 공정하게 처리되는가?"

---

## 한 줄 요약 (이력서용)

> Redis 가상 대기열 + Lua 원자 연산 기반 재고 동시성 제어 + Kafka 비동기 예매 파이프라인으로
> **순간 트래픽 스파이크**를 처리하는 티케팅 백엔드를, K8s 인프라와 React 프론트까지 포함해 단독 설계·구현.
> 부하 테스트로 **오버셀 0**과 **수평 확장 3.76배**를 수치로 증명.

---

## 수치로 증명한 것

말이 아니라 측정값으로 남긴 결과입니다. 전체 방법론과 원자료는 [`infra/loadtest/RESULTS.md`](./infra/loadtest/RESULTS.md).

| 검증 | 결과 |
|---|---|
| **오버셀 0** | 이중 CONFIRMED **0건**. 대기열 게이팅을 **제거하고** 재고에 직접 몰아붙여도 0 |
| **수평 확장** | queue-service 1→6 replica에서 처리량 **3.76배**(494 → 1,858 rps), 왕복 p95 **14배** 개선 |
| **자동 스케일** | HPA가 부하 40초 만에 감지, gateway는 6파드/67%에서 스스로 균형점 안착 |
| **한계 규명** | 12스레드 단일 노드 천장 ≈ **1,800 rps** — 그 이상은 파드를 늘려도 처리량이 안 는다 |

**부하 테스트가 실제 버그를 두 번 잡았습니다.** 이게 이 프로젝트에서 가장 얘기할 거리가 많은 부분입니다.

1. `holdStanding`이 후보 좌석을 31개만 조회해 동시 구매자가 서로 같은 좌석만 노리던 문제
   → 후보창 확대 + 무작위화로 **동시 hold 21 → 934**
2. **k8s Service(L4) + HTTP keep-alive** 조합으로 스케일아웃한 파드가 트래픽을 못 받던 문제
   → 커넥션 풀에 수명을 부여해 **동일 파드 수에서 +41%**

---

## 4가지 핵심 트래픽 전략

| # | 전략 | 해결하는 문제 | 핵심 기술 |
|---|------|---------------|-----------|
| 1 | **가상 대기열** | 순간 트래픽이 DB/앱 서버를 덮치는 것을 방지 | Redis Sorted Set + 입장 토큰(JWT) |
| 2 | **재고 동시성 제어** | 좌석/재고 오버셀 방지 | Redis Lua 원자 연산 + `ticket.status` 조건부 UPDATE (2층 방어) |
| 3 | **비동기 예매/결제** | 예매 요청을 큐로 흘려 부하 평탄화 | Kafka + 트랜잭셔널 아웃박스 |
| 4 | **부하 테스트 + 관측** | "빠르다"를 수치로 증명 | k6 + Prometheus/Grafana(파드 단위) |

설계 의도와 트레이드오프는 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 폴더 구조

```
high-traffic-ticketing/
├── figma/      # UI·UX 기획 스펙 (화면·플로우·디자인 토큰)
├── front/      # React (Vite + TS) — 대기열/예매/결제 화면
├── back/       # NestJS monorepo (MSA) — gateway + user/queue/reservation/payment
├── infra/      # docker-compose · k8s(base+overlays) · k6 부하테스트
└── docs/       # 아키텍처 · 브랜치 전략 · 포트폴리오 요약
```

각 폴더는 자체 README로 독립적으로 읽힙니다:
[figma](./figma/README.md) · [front](./front/README.md) · [back](./back/README.md) · [infra](./infra/README.md)

---

## 전체 흐름 (한눈에)

```
[사용자]
   │  1. 예매 페이지 진입
   ▼
[가상 대기열] ──Redis ZSET── 내 순번/예상 대기시간 폴링
   │  2. 입장 순서 도달 → 입장 토큰 발급
   ▼
[좌석 선택] ── Redis Lua로 좌석 점유(TTL) ── 오버셀 1차 방어
   │  3. 예매 요청 (202 즉시 응답)
   ▼
[Kafka] ──reservation.requested── 비동기 처리, 부하 평탄화
   │  4. 컨슈머가 결제 + ticket.status 조건부 UPDATE(2차 방어) + DB 영속화
   ▼
[결제 결과] ── 주문 상태 폴링으로 확인
```

DB 커밋과 이벤트 발행 사이의 유실을 막기 위해 **트랜잭셔널 아웃박스**를 쓴다.
자세한 시퀀스와 좌석/주문 상태 머신은 [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## 빠른 시작 (로컬)

```bash
# 1) 의존 인프라 (redis · kafka · postgres · minio · prometheus · grafana)
cd infra/docker && docker compose up -d

# 2) 백엔드 — 5개 서비스 동시 기동
cd ../../back && npm install
npx prisma migrate deploy
npm run seed                  # 공연·좌석·유저 시드 (없으면 화면이 비어 있습니다)
npm run start:all             # 또는 npm run dev (인프라 기동까지 한 번에)

# 3) 프론트
cd ../front && npm install && npm run dev    # http://localhost:5173

# 4) 부하 테스트
cd ../infra/loadtest && k6 run -e BASE=http://localhost:3000 waiting-queue.js
```

스모크 테스트는 `back`에서 `npm run e2e` (등록→로그인→대기열→hold→예매→결과 폴링).

---

## 배포 환경

| 환경 | 용도 | 상태 |
|---|---|---|
| `local` | docker-desktop / kind | 개발용 |
| `dev` | 노트북 k3s (4코어) | **오버셀 0 검증** 완료 |
| `pc` | PC k3d (12스레드) | **수평 확장·HPA 측정** 완료 |
| `aws` | EKS + ElastiCache/MSK/RDS | 매니페스트만 작성, **미검증** |

base manifest는 하나이고 환경 차이는 Kustomize overlay로만 흡수합니다.
절차는 [`infra/README.md`](./infra/README.md).

---

## 기술 스택

- **Front**: React 18, Vite 5, TypeScript, TanStack Query, Zustand, React Router, i18next(ko/en)
- **Back**: NestJS monorepo (gateway·user·queue·reservation·payment), TypeScript, Prisma, ioredis, kafkajs, opossum
- **Data**: PostgreSQL, Redis, Apache Kafka, MinIO(S3 호환)
- **Infra**: Docker, Kubernetes(Kustomize, HPA), k3s/k3d
- **Observability**: Prometheus, Grafana, k6, pino
- **Design**: Figma (스펙은 [`figma/`](./figma/README.md)에 문서화)

## 문서

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 설계 목표 · 4대 전략 · 시퀀스 · 상태 머신 · 트레이드오프
- [`docs/PORTFOLIO.md`](./docs/PORTFOLIO.md) — 이력서용 요약
- [`docs/BRANCHING.md`](./docs/BRANCHING.md) — 브랜치 전략
- [`COMMIT_CONVENTION.md`](./COMMIT_CONVENTION.md) — 커밋 메시지 양식
- [`infra/loadtest/RESULTS.md`](./infra/loadtest/RESULTS.md) — 부하 테스트 결과 (정본)

## 라이선스

MIT
