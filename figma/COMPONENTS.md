# 컴포넌트 스펙

| 컴포넌트 | props (핵심) | 비고 |
|----------|--------------|------|
| `Button` | variant(primary/ghost/danger), size, loading | CTA 공통 |
| `QueueProgress` | rank, total, etaSeconds | S2 대기열 핵심 |
| `EntryTokenTimer` | expiresAt | 입장 토큰 만료 카운트다운 |
| `SeatMap` | seats[], onSelect, heldSeatId | S3, 잔여/점유 색상 |
| `OrderSummary` | items[], totalPrice | S4 |
| `StatusPoller` | reservationId, onResult | S5 비동기 결과 폴링 |
| `Countdown` | targetTime | S1 오픈 카운트다운 |
| `Toast` | type, message | 점유 실패/만료 알림 |

## 상태 컬러 규칙
- 대기중 → warning / 입장가능·성공 → success / 매진·실패 → danger
