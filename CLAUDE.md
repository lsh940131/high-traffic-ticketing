# CLAUDE.md — 프로젝트 AI 작업 문맥

이 파일은 이 저장소에서 작업하는 AI(및 사람)가 먼저 읽는 루트 문맥 파일이다.

## 프로젝트 한 줄

High-Traffic Ticketing — 티켓 오픈 순간 트래픽 폭증을 견디는 티케팅 시스템(솔로 포트폴리오).

## 구조

- `back/` — NestJS monorepo MSA (gateway·queue·reservation·payment). Redis 대기열(ZSET) · Lua 재고 차감 · Kafka 비동기 예매.
- `front/` — React (Vite + TS).
- `infra/` — docker-compose(로컬 의존성) · k8s(base + overlays: local·dev·aws) · k6(부하 테스트).
- `figma/` — 디자인 스펙·컴포넌트. (`figma/CLAUDE.md`에 별도 작업 문맥)
- `docs/` — 아키텍처 등 루트 문서.

## 참고 문서 (작업 전 확인)

- `docs/ARCHITECTURE.md` — 시스템 설계·4대 트래픽 전략·좌석/주문 상태 머신.
- `COMMIT_CONVENTION.md` — 커밋 메시지 양식.
- `back/docs/transactions.md` — 트랜잭션 처리 방침(현재 plain Prisma).
- `infra/k8s/README-dev.md` — **dev(k3s 노트북) 배포·부하 테스트 작업 문서.** 레지스트리 배포 결정 배경 + 런북 + 현재 진행 상태(재개 지점). k3s 배포 작업 시 먼저 읽을 것.
- `infra/k8s/README-pc.md` — **PC 단일 노드 큰 부하·스케일아웃 라이브 시연 계획.** 노트북서 못 뽑은 수평 확장 곡선·HPA를 자원 넉넉한 PC로 보여주는 다음 단계.
- `figma/CLAUDE.md` — 디자인 작업 문맥.

## ✅ 커밋 메시지

커밋 메시지는 **반드시 `COMMIT_CONVENTION.md`를 따른다.**
메시지를 작성/제안하기 전에 그 문서(type·scope 목록, 형식)를 확인할 것.
형식 요약: `scope(type): 제목` — "어디에(scope) 무엇을(type)" 순서. scope·type 둘 다 필수, 목록은 `COMMIT_CONVENTION.md` 참고.

## 주의

- 개발 환경: 앱 실행은 `back/`·`front/` 각각 `npm install`, 협업 도구(lint/husky)는 루트 `npm install`.
- 로컬 인프라: `infra/docker`에서 `docker compose up -d` (redis·kafka·postgres 등).
