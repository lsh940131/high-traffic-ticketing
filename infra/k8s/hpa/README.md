# HPA 애드온 — CPU 기반 파드 자동 증식

`monitoring/`처럼 앱 매니페스트와 **분리해 별도 적용**하는 애드온이다.
수동 스케일 시연 중엔 HPA가 replica를 되돌려버리므로, 순서상 **나중에** 얹는다.

## 적용 / 해제

```bash
kubectl apply -k infra/k8s/hpa       # 자동 스케일 ON
kubectl -n ticketing get hpa -w      # TARGETS(현재%/목표%) · REPLICAS 실시간 관찰
kubectl delete -k infra/k8s/hpa      # OFF (다시 수동 kubectl scale)
```

## 대상 · 임계

| Deployment | min | max | 목표 CPU | 비고 |
|---|--:|--:|--:|---|
| `gateway` | 2 | 8 | 70% | 단일 진입점, 가장 먼저 포화 |
| `queue-service` | 2 | 8 | 70% | status 폴링 트래픽이 많음 |
| `reservation-service` | 1 | 6 | 70% | 뒤에 postgres 커넥션 풀 → max 보수적 |

- **`averageUtilization`은 `limits`가 아니라 `requests` 대비**다.
  `overlays/pc`가 이 3종의 requests를 `500m`으로 올리므로 **70% = 파드당 350m**에서 증식 시작.
  (base의 `200m`을 그대로 쓰면 70%=140m이라 부하가 걸리자마자 곧장 max까지 튀어 곡선이 안 보인다.)
- `behavior`: 증식은 즉시(15s마다 최대 2파드), 축소는 60s 안정화 — 라이브 시연에서
  올라가는 건 빨리 보이고, 부하 출렁임에 파드가 요동치진 않게.

## 전제

- **metrics-server** — k3s/k3d 내장이라 그대로 동작. Docker Desktop 쿠버네티스는 미포함이므로 별도 설치 필요.
  확인: `kubectl top pods -n ticketing` 이 값을 뱉으면 OK.
- 대상 Deployment에 `resources.requests.cpu` 존재(base에 이미 있음).

## 관찰

Grafana "Ticketing — Live (scale-out)" 대시보드의 **★ 파드 수 / service** 패널이
`count by (service)(up{job="ticketing-services"} == 1)` 로 그려지므로,
HPA가 증식시킨 파드가 계단식으로 올라가는 게 그대로 보인다.
