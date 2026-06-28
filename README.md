# 🎟️ High-Traffic Ticketing

대규모 트래픽(콘서트·공연 티켓 오픈)을 견디는 티케팅 시스템 **솔로 포트폴리오 프로젝트**.
한 레포에 기획(figma) · 프론트(React) · 백엔드(NestJS) · 인프라(K8s)를 모두 담아, 이력서에 링크 하나로 어필할 수 있게 구성했습니다.

> 핵심 도전: "10만 명이 동시에 '예매하기'를 누르면 어떻게 시스템이 안 죽고, 재고는 정확히 맞고, 사용자는 공정하게 처리되는가?"

---

## 한 줄 요약 (이력서용)

> Redis 가상 대기열 + 분산락 기반 재고 동시성 제어 + Kafka 비동기 예매 파이프라인으로 **순간 트래픽 스파이크**를 처리하는 티케팅 백엔드를, K8s(local/dev/AWS) 인프라와 React 프론트까지 포함해 단독 설계·구현.

---

## 4가지 핵심 트래픽 전략

| # | 전략 | 해결하는 문제 | 핵심 기술 |
|---|------|---------------|-----------|
| 1 | **가상 대기열 (Waiting Queue)** | 순간 트래픽이 DB/앱 서버를 덮치는 것을 방지 | Redis Sorted Set + 입장 토큰(JWT) |
| 2 | **재고 동시성 제어** | 좌석/재고 오버셀(초과 판매) 방지 | Redis Lua 원자 연산 + 분산락 |
| 3 | **비동기 예매/결제** | 예매 요청을 큐로 흘려보내 부하 평탄화(load leveling) | Kafka 프로듀서/컨슈머 |
| 4 | **부하 테스트 + 지표** | "빠르다"를 수치로 증명 | k6 부하 테스트 + Prometheus/Grafana |

---

## 폴더 구조

```
high-traffic-ticketing/
├── figma/      # UI·UX 기획 스펙 (화면·플로우·디자인 토큰) — 딱 필요한 만큼
├── front/      # React (Vite + TS) — 대기열/예매/결제 화면
├── back/       # NestJS monorepo (MSA) — gateway + queue/reservation/payment 서비스
├── infra/      # K8s 기반 (docker-compose / k8s base+overlays / k6)
└── docs/       # 아키텍처, ADR, 시퀀스 다이어그램
```

각 폴더는 자체 README를 가지고 있어 독립적으로 읽을 수 있습니다:
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
[좌석 선택] ── Redis Lua로 좌석 점유(TTL) ── 오버셀 방지
   │  3. 예매 요청
   ▼
[Kafka] ──reservation.requested── 비동기 처리, 부하 평탄화
   │  4. 컨슈머가 재고 확정 + 결제 + DB 영속화
   ▼
[결제 완료] ── WebSocket/폴링으로 결과 통지
```

자세한 시퀀스는 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) 참고.

---

## 빠른 시작 (로컬)

```bash
# 1) 인프라(redis, kafka, postgres) 한 번에 기동
cd infra/docker && docker compose up -d

# 2) 백엔드 (MSA 4개 서비스 동시 기동)
cd ../../back && npm install && npm run start:all

# 3) 프론트
cd ../front && npm install && npm run dev

# 4) 부하 테스트
cd ../infra/loadtest && k6 run waiting-queue.js
```

환경별 배포(local → dev 노트북 → AWS)는 [infra/README.md](./infra/README.md) 참고.

---

## 기술 스택

- **Front**: React 18, Vite, TypeScript, TanStack Query, Zustand
- **Back**: NestJS 10 monorepo (MSA: gateway·queue·reservation·payment), TypeScript, Prisma, ioredis, kafkajs
- **Data**: PostgreSQL, Redis, Apache Kafka
- **Infra**: Docker, Kubernetes(Kustomize), AWS(EKS/ElastiCache/MSK/RDS)
- **Observability**: Prometheus, Grafana, k6
- **Design**: Figma (스펙은 `figma/`에 문서화)

## 라이선스
MIT
