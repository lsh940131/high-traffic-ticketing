# 💻 front — React (Vite + TS)

figma 스펙(`../figma`)을 보고 화면과 흐름을 구성한다. 핵심은 **대기열 폴링**과 **비동기 예매 결과 폴링** — 트래픽 전략이 UI에서 드러나는 두 지점.

## 스택
React 18 · Vite · TypeScript · TanStack Query(서버 상태/폴링) · Zustand(클라 상태) · React Router

## 구조
```
src/
├── api/        # 백엔드 호출 (axios 인스턴스 + 도메인별 함수)
├── hooks/      # useWaitingQueue, useReservationStatus 등 핵심 훅
├── pages/      # S0~S6 화면
├── components/ # QueueProgress, SeatMap 등
├── store/      # Zustand (입장 토큰 등)
├── types/      # 백엔드 DTO와 맞춘 타입
└── styles/     # tokens.css (figma 토큰과 동기화)
```

## 실행
```bash
npm install
cp .env.example .env
npm run dev   # http://localhost:5173
```

## 핵심 훅
- `useWaitingQueue(eventId)` — 2~3초 폴링으로 순번/입장가능 여부 갱신, 입장 토큰 수령
- `useReservationStatus(reservationId)` — 비동기 예매 결과 폴링(성공/실패/처리중)
