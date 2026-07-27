# 💻 front — React (Vite + TS)

figma 스펙(`../figma`)을 보고 화면과 흐름을 구성한다. 핵심은 **대기열 폴링**과 **비동기 예매 결과 폴링**
— 트래픽 전략이 UI에서 드러나는 두 지점.

## 스택

React 18 · Vite 5 · TypeScript 5 · TanStack Query 5(서버 상태/폴링) · Zustand 4(클라 상태) ·
React Router 6 · i18next(ko/en) · axios

## 구조

기능 단위(`features/`) + 공용 자산(`shared/`)으로 나눈다. 페이지는 조립만 하고 로직은 feature가 갖는다.

```
src/
├── app/          # App.tsx(라우팅·프로바이더) · ScrollToTop
├── pages/        # 화면 단위. feature 훅을 조립해 렌더링만
├── features/
│   ├── auth/     # 로그인·회원가입, ProtectedRoute, 토큰 store
│   ├── concert/  # 공연 목록·상세·판매 정보
│   ├── queue/    # 대기열 진입·폴링 (useWaitingQueue)
│   └── booking/  # 좌석 hold·주문·결과 폴링 (useReservationStatus)
├── shared/
│   ├── api/      # axios 인스턴스(client.ts) — 토큰 주입·에러 봉투 처리
│   ├── ui/       # 디자인 시스템 컴포넌트 28종 (Button·Badge·SeatMap·AppBar…)
│   ├── i18n/     # i18next 설정 + locales/{ko,en}.json
│   ├── theme/    # 라이트·다크 테마
│   ├── lib/      # format 유틸
│   └── types/    # 백엔드 DTO와 맞춘 타입
└── styles/       # tokens.css (figma 토큰과 동기화)
```

각 feature는 `api.ts`(호출) · `hooks`(TanStack Query) · `store.ts`(Zustand)로 같은 모양을 갖는다.

## 라우팅

`/login`·`/signup`을 제외한 전부가 `ProtectedRoute` 아래에 있다.

| 경로 | 화면 |
|---|---|
| `/` | 공연 목록 |
| `/concerts/:id` | 공연 상세 |
| `/concerts/:id/queue` | **대기열** (순번 폴링 → 입장 토큰 수령) |
| `/concerts/:id/seats` | 좌석 선택 (hold) |
| `/concerts/:id/order` | 주문·결제 |
| `/orders/:orderId` | **결과** (비동기 예매 결과 폴링 → 재결제·취소) |
| `/mypage` | 예매 내역 |

매칭되지 않는 경로는 `/`로 리다이렉트한다.

## 핵심 훅 — 트래픽 전략이 드러나는 곳

- **`useWaitingQueue(concertId)`** — 대기열 진입 후 순번·입장 가능 여부를 주기 폴링하고 입장 토큰을 받는다.
  폴링 주기는 `VITE_QUEUE_POLL_INTERVAL_MS`(기본 2.5초). 이 값이 곧 queue-service로 가는 부하다.
- **`useReservationStatus(orderId)`** — 예매는 Kafka로 비동기 처리되므로 응답이 즉시 확정되지 않는다.
  주문 상태를 폴링해 처리중/성공/실패를 보여준다.

## 실행

```bash
npm install
cp .env.example .env
npm run dev       # http://localhost:5173

npm run build     # tsc && vite build
npm run preview   # 빌드 결과 미리보기
npm run lint
```

`.env` 항목은 둘뿐이다.

| 변수 | 기본값 | 용도 |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | gateway 주소 |
| `VITE_QUEUE_POLL_INTERVAL_MS` | `2500` | 대기열 폴링 주기 |

## 컨테이너

빌드 산출물을 **nginx**로 서빙한다(`Dockerfile` + `nginx.conf`).

```bash
docker build -t ticketing-front:latest .
```

- SPA 폴백: 알 수 없는 경로는 `index.html`로 → 클라이언트 라우팅이 처리
- `/assets/`는 해시 파일명이라 1년 캐시(immutable)
- **`/api` 프록시는 하지 않는다** — k8s ingress가 gateway로 보낸다

## 참고 문서

- [`../figma/CLAUDE.md`](../figma/CLAUDE.md) — 디자인 스펙·컴포넌트 작업 문맥
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — 대기열·비동기 예매가 왜 이런 UI가 되는지
- [`../back/README.md`](../back/README.md) — 호출하는 API의 서비스 구성
