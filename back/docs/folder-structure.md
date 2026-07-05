# 소스 폴더 구조 정책 (back/apps)

각 NestJS 앱의 `src/` 내부를 어떻게 나누는지에 대한 방침과 배경을 정리한다.

> **현재 방침 (2026-07 기준):** 앱마다 **도메인 폴더**를 두고, 그 안에서 역할이 다른 컴포넌트(메시징·워커·하위 도메인)를 **하위 폴더로 분리**한다. 루트 모듈 파일명은 **앱 이름 기준**(`<app>.module.ts`)을 유지한다. 새 파일을 추가할 때 이 문서의 규칙을 따른다.

핵심 원칙: **"어느 도메인(폴더)에 무엇을(역할별 하위 폴더)"** — 파일 이름이 아니라 위치로 역할이 드러나게 한다.

---

## 1. 앱 표준 레이아웃

```
<app>/src/
  main.ts                    # 부트스트랩. 항상 src 루트에 둔다.
  <domain>/                  # 앱의 코어 도메인 폴더
    <app>.module.ts          # 루트 모듈 (앱 이름 기준, 아래 §3)
    <domain>.controller.ts   # HTTP 컨트롤러
    <domain>.service.ts      # 도메인 서비스
    messaging/               # Kafka 프로듀서·컨슈머 (있을 때만)
    worker/                  # 인프로세스 스케줄러·잡 (있을 때만)
  <other-domain>/            # 같은 앱의 추가 도메인 (있을 때만)
```

- `main.ts`는 순수 부트스트랩이므로 도메인 폴더에 넣지 않고 `src` 루트에 둔다.
- 코어 로직은 반드시 도메인 폴더(`gateway/`·`queue/`·`payment/`·`reservation/`) 안에 둔다. `src` 루트에 컨트롤러·서비스를 흩뿌리지 않는다.

## 2. 역할별 하위 폴더

플랫하게 두지 않고 **역할이 다르면 하위 폴더로 가른다.** 판단 기준은 "무엇으로 트리거되는가"다.

| 하위 폴더 | 들어가는 것 | 기준 |
| --- | --- | --- |
| `messaging/` | Kafka 프로듀서·컨슈머 | 메시지 브로커(Kafka)로 In/Out 하는 컴포넌트 |
| `worker/` | 인프로세스 스케줄러·주기 잡 | `setInterval`·타이머 등으로 도는 것. **브로커 아님** |
| `<sub-domain>/` | 코어에서 갈라진 하위 도메인 | 예: `gateway/upstream/` |

> **`messaging/` vs `worker/` 주의:** 이름만 "worker/consumer"라고 무조건 `messaging/`에 넣지 않는다. 실제로 Kafka를 쓰면 `messaging/`, 아니면 `worker/`다. (예: `queue.worker.ts`는 `setInterval` 스케줄러라 `worker/`)

## 3. 루트 모듈 파일명 — 앱 이름 기준 유지

루트 모듈은 **도메인명이 아니라 앱 이름**을 따른다. 앱 폴더에 `-service` 접미사가 있으면 그대로 반영한다.

| 앱 | 모듈 파일 | 클래스 |
| --- | --- | --- |
| `gateway` | `gateway.module.ts` | `GatewayModule` |
| `queue-service` | `queue-service.module.ts` | `QueueServiceModule` |
| `reservation-service` | `reservation-service.module.ts` | `ReservationServiceModule` |
| `payment-service` | `payment-service.module.ts` | `PaymentServiceModule` |

> `payment.module.ts`처럼 도메인 기준으로 줄이는 안도 있었으나, 그러면 앱 폴더명과 어긋나 4개 앱의 일관성이 깨진다. **앱 이름과 파일명을 일치**시키는 쪽을 택했다.

## 4. 현재 구조 스냅샷

```
gateway/src/
  main.ts
  gateway/
    gateway.module.ts
    proxy.controller.ts
    upstream/
      upstream.service.ts        # 다운스트림 호출 안전장치(서킷브레이커 등)

queue-service/src/
  main.ts
  queue/
    queue-service.module.ts
    queue.controller.ts
    queue.service.ts
    worker/
      queue.worker.ts            # 정원만큼 주기 입장 처리(setInterval)

payment-service/src/
  main.ts
  payment/
    payment-service.module.ts
    payment.service.ts
    messaging/
      reservation.consumer.ts    # reservation.requested 소비 → 결제

reservation-service/src/
  main.ts
  reservation/
    reservation-service.module.ts
    reservation.controller.ts
    messaging/
      reservation.producer.ts    # reservation.requested 발행
  event/                         # 코어와 분리된 하위 도메인
    event.controller.ts
  inventory/
    inventory.service.ts         # Lua 재고 차감 등
```

## 5. 새 파일 추가 시 체크리스트

1. 코어 도메인 로직인가? → `<domain>/`에 둔다. `src` 루트 금지.
2. Kafka로 메시지를 주고받나? → `<domain>/messaging/`.
3. 타이머·스케줄러로 도는가? → `<domain>/worker/`.
4. 코어에서 충분히 갈라진 하위 도메인인가? → `<domain>/<sub-domain>/` (또는 앱 `src` 아래 별도 도메인 폴더).
5. 루트 모듈을 새로 만드나? → 파일명은 앱 이름 기준(§3).
