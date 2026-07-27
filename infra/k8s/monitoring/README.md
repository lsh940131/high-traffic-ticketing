# 관측 스택 — Prometheus + Grafana (실시간 부하 대시보드)

부하테스트를 **숫자 대신 실시간 그래프**로 본다. 부하(k6) + 서버 포화(CPU·이벤트루프 지연)를
한 화면에서 동시에 관찰. 앱 `base/overlay`와 분리된 **관측 애드온**이라 별도 적용한다.

## 적용

```bash
kubectl apply -k infra/k8s/monitoring        # ticketing 네임스페이스에 얹힘
kubectl -n ticketing rollout status deploy/grafana
```

## 접속 (LAN)

| 대상 | 주소 | 인증 |
|---|---|---|
| **Grafana 대시보드** | `http://<클러스터IP>:30991` → "Ticketing — Live (scale-out)" | 익명 열람 / admin·admin |
| Prometheus | `http://<클러스터IP>:30990` | — |

> `<클러스터IP>`는 클러스터를 어디에 띄웠느냐에 따라 다르다 — 노트북 k3s면 노트북 IP(`README-dev`),
> PC k3d면 PC IP(`README-pc`).

## 데이터 소스 (2종)

- **서버측** — Prometheus가 앱 5종(`gateway·queue·reservation·payment·user`) `/metrics`를 5s 간격 스크레이프.
  주요 지표: `process_cpu_seconds_total`(rate=CPU cores), `nodejs_eventloop_lag_p99_seconds`(**포화 신호**),
  `process_resident_memory_bytes`.
  - **파드 단위 디스커버리**(`kubernetes_sd_configs: role: endpoints`)라 파드마다 개별 타겟이 잡히고
    `service`·`pod` 라벨이 붙는다. Service DNS를 static 타겟으로 잡으면 replica가 2개 이상일 때
    스크레이프가 임의의 파드로 분산돼 카운터가 섞인다(= rate 왜곡) — 스케일아웃 관찰이 불가능해진다.
  - 디스커버리 권한은 `ticketing` 네임스페이스로 한정된 ServiceAccount + Role(매니페스트에 포함).
- **클라이언트측** — k6가 Prometheus로 remote-write. `k6_vus`, `k6_http_reqs_total`(RPS),
  `k6_http_req_duration_p95{name=…}`(엔드포인트별 지연), `k6_http_req_failed_rate`, 커스텀
  `k6_reserved_ok_total`·`k6_sold_out_total`.

## k6를 대시보드로 스트리밍하며 실행

```bash
K6_PROMETHEUS_RW_SERVER_URL=http://<클러스터IP>:30990/api/v1/write \
K6_PROMETHEUS_RW_TREND_STATS="p(95),p(99),avg" \
k6 run -o experimental-prometheus-rw \
   -e BASE=http://<클러스터IP>:30300 -e PEAK=1500 waiting-queue.js
```

- Prometheus는 `--web.enable-remote-write-receiver`로 k6 수신을 연다(매니페스트에 반영됨).
- 실행 중 Grafana 대시보드가 5s 자동 갱신되며 VU 램프 → gateway CPU·이벤트루프 지연 급등 → 지연/RPS 곡선을 그린다.

## 대시보드 패널 — "Ticketing — Live (scale-out)"

★는 수평 확장 시연에서 같이 봐야 하는 4종.

- **부하·결과(k6)**: VUs / ★RPS / ★엔드포인트별 p95 지연 / 실패율 / 예매 성공·매진(누적)
- **스케일**: ★파드 수 per service(`count by (service)(up == 1)`, 계단식) /
  ★CPU per 파드(파드가 늘면 선이 늘고 각 선은 내려감) / CPU 합계 per service
- **포화**: 이벤트루프 지연 p99(서비스별 최악 파드) / 메모리 합계 / active handles 합계

## 비고

- 데이터는 `emptyDir`(휘발) + 보존 6h — dev용. 파드 재생성 시 초기화.
- 단일 4코어 노드에선 Prometheus·Grafana도 CPU를 나눠 쓰므로, 극한 부하 시엔 관측 자체가 약간의 부하가 됨(측정엔 큰 영향 없음).
