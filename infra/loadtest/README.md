# 전략④: k6 부하 테스트

티켓 오픈 순간을 재현해 시스템이 죽지 않고, 오버셀이 0인지 수치로 증명한다.
결과는 [`RESULTS.md`](./RESULTS.md).

## 스크립트 3종 — 목적이 다르다

| 스크립트 | executor | 답하는 질문 |
|---|---|---|
| `waiting-queue.js` | `ramping-vus` + `sleep(1)` 폴링 | 스파이크에서 **죽지 않는가** (VU 많고 RPS 적음) |
| `reservation.js` | `constant-arrival-rate` | **오버셀 0**인가 (도착률 고정) |
| `scale-out.js` | `constant-vus`, think time 없음 | **replica↑ → 처리량↑ · 지연↓** 인가 |

`scale-out.js`가 따로 있는 이유: 앞의 둘로는 수평 확장이 안 보인다.
`ramping-vus`+sleep은 VU당 ~1 req/s라 서버를 밀어붙이지 못하고, `constant-arrival-rate`는
RPS를 고정하므로 파드를 늘려도 지연만 떨어질 뿐 **처리량 증가가 그래프에 안 나온다.**
고정 VU + think time 없음이면 `처리량 = VU / 지연` 이라 지연이 떨어진 만큼 RPS가 올라간다.

## 실행

```bash
export BASE=http://<클러스터IP>:30300
export JWT_SECRET=dev-notebook          # 클러스터의 back-secret 과 동일해야 함

k6 run -e BASE=$BASE -e PEAK=1500 waiting-queue.js        # 대기열 스파이크
k6 run -e BASE=$BASE -e RATE=150 reservation.js           # 예매 (오버셀 검증)
k6 run -e BASE=$BASE -e VUS=400 -e DURATION=10m scale-out.js   # 수평 확장 곡선
```

Grafana로 스트리밍하며 보려면 `-o experimental-prometheus-rw` — [`../k8s/monitoring/README.md`](../k8s/monitoring/README.md).

## 부하생성기 천장 먼저 재기 (중요)

**부하를 만드는 쪽이 먼저 한계에 닿으면, 서버가 아직 여유가 있는데도 곡선이 평평해진다.**
스케일아웃 측정에선 이게 곧 오측정이므로, 본 측정 전에 천장을 확인한다.

```bash
# 스케일 대상을 미리 최대로 올려둔 상태에서
k6 run -e BASE=$BASE -e MODE=calibrate -e VUS=1200 scale-out.js
```

- RPS가 평평해지는 지점에서 **Grafana의 서버 CPU가 포화가 아니면 → 부하생성기가 천장**이다.
  (부하 머신에서 `top`으로 k6 프로세스가 코어 수 × 100%에 붙었는지 같이 확인)
- 본 측정은 그 천장보다 **낮은** VU로 돈다. 천장이 모자라면 replica 상한을 낮춰서
  곡선을 온전히 뽑는 편이, 상한까지 갔다가 평평해진 걸 변명하는 것보다 낫다.
- `scale-out.js`는 `discardResponseBodies: true`로 본문 파싱을 생략해 생성기 천장을 높여 뒀다
  (상태코드만 보면 되는 스크립트라 손해가 없다).

## 인증 모델

k6가 `JWT_SECRET`으로 AT를 직접 서명해 "이미 로그인된 사용자"를 시뮬레이션한다
(실제 티켓팅과 동일 — 오픈 전 로그인, 오픈 순간엔 대기열·예매만).
`reservation.js`는 `Order.userId` FK를 채워야 해서 `users.json`의 **실제 시드 유저 ID**를 쓴다.

## 보는 지표

- `http_req_duration` p95/p99, `http_req_failed`
- 오버셀 건수 (= 판매 좌석 수 - 실제 재고). 0이어야 성공.
- 처리량(RPS)과 파드 수 — 스케일아웃에선 이 둘의 관계가 결론이다.
