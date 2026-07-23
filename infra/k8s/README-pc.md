# PC 단일 노드 — 더 큰 부하 + 스케일아웃 라이브 시연 (계획)

노트북(4코어) k3s에서 **오버셀 0**은 증명했지만, 노드 CPU가 먼저 포화라
**"replica↑ → 처리량↑" 수평 확장 곡선**은 못 뽑았다. 자원이 넉넉한 **PC로 클러스터를 옮겨**,
Grafana로 실시간 관찰하며 **pod을 늘리면 처리량이 오르고 지연이 떨어지는 것**을 눈으로 보여준다.

> 짝 문서: 노트북 k3s = [`README-dev.md`](./README-dev.md), AWS = `README-aws.md`.
> 이 문서는 **다음 단계(프론트 완료 후) 큰 부하 시연을 이어서 할 때 읽는 계획 문서**다.

---

## 왜 PC인가 (노트북 대비)

| | 노트북 (현재 클러스터) | **PC (Ryzen 5 7600)** |
|---|---|---|
| CPU | 4코어 | **6코어 / 12스레드** (~3배) |
| RAM | ~8GB | **31GB** (~4배) |
| Docker/WSL2 | — | 12코어 · 15GB 할당(`.wslconfig`로 상향 가능) |

- **핵심 이득**: 남는 코어가 생겨, Node.js(프로세스당 1코어) 서비스의 replica를 늘리면
  **새 pod가 놀던 코어를 실제로 차지** → 처리량이 오른다. 노트북에선 코어가 꽉 차 안 보이던 그림.

---

## 토폴로지 — 지금과 **반대로 뒤집기**

부하생성기와 대상이 같은 머신이면 측정이 오염된다. 그래서 **더 큰 PC가 클러스터(대상)**,
**노트북이 부하(k6)**를 맡아 물리 분리한다.

```
[노트북]  k6 부하 생성  ──LAN──►  [PC]  k8s 클러스터 (6코어/31GB)
 (현재의 PC↔노트북 역할을 스왑)          gateway·queue·reservation·payment·user
                                        + redis·postgres·kafka·minio
                                        + prometheus·grafana (관측)
```

- k6 → PC의 gateway NodePort(예: `:30300`)로 부하. Grafana(`:30991`)는 어디서든 열람.

---

## PC에 k8s 올리는 법 (택1)

이미 Docker Desktop이 있으니 아래 중 하나.

- **Docker Desktop 내장 Kubernetes** — 설정에서 켜기만 하면 단일 노드 클러스터. 제일 간단.
- **k3d** (권장) — 도커 안에 k3s. 노트북과 **동일한 k3s**라 매니페스트·overlay 그대로 이전.
  `k3d cluster create ticketing -p "30300:30300@server:0" ...` 식으로 NodePort 매핑.
- **kind** — 도커 안에 정식 k8s. EKS와 더 가깝지만 k3s 경험과는 약간 다름.

> 매니페스트는 그대로 재사용: `overlays/dev`의 이미지 레지스트리 주소만 PC 로컬에 맞추면 됨
> (PC에서 빌드→PC 클러스터가 pull이면 레지스트리조차 생략 가능 — `k3d image import`).

---

## 스케일 시연 시나리오 (머니 샷)

```
1. k6로 부하를 일정하게 유지          → Grafana에서 gateway CPU 포화 · p95 지연 상승 확인
2. kubectl -n ticketing scale deploy/gateway --replicas=4   (라이브)
3. Grafana: 새 pod가 코어 잡음        → 처리량(RPS)↑ · p95 지연↓ 이 실시간으로 뚝 떨어짐
4. 병목이 옮겨가면(reservation·postgres·redis) 그 서비스도 스케일 → 반복
```

**HPA(자동 스케일)까지:** k3s metrics-server 내장이라
```
kubectl -n ticketing autoscale deploy/gateway --cpu-percent=70 --min=2 --max=8
```
→ 부하 올리면 **pod가 스스로 증식**, 부하 빠지면 축소되는 것까지 라이브로. (수동 scale보다 한 수 위)

---

## 한계 (정직하게)

- **단일 노드 천장은 여전함**: PC도 한 대라 ~12스레드를 다 쓰면 평평해진다. 진짜 무한 수평확장·
  **노드 오토스케일**은 멀티노드/클라우드(EKS) 영역 — 그건 `README-aws.md`로.
- **병목은 이동한다**: gateway를 늘리면 다음 병목이 reservation·postgres 커넥션·redis(싱글스레드)로 옮겨간다.
  → "병목을 찾아 늘리고, 옮겨가는 걸 관찰"하는 것 자체가 좋은 데모.
- **부하생성기(k6) 측 한계**: 아주 큰 부하(수천~만 VU)에선 **노트북 4코어 k6**도 한계가 올 수 있다.
  그땐 k6쪽 CPU도 같이 관찰. (필요 시 k6를 더 센 기기로)
- **데이터 영속성**: 현재 매니페스트는 `emptyDir`(휘발). 반복 시연이면 재시드 절차 필요(→ `README-dev` 참고),
  제대로 하려면 PVC.

---

## 선행 / 재개 트리거

- 선행: **프론트(React) 완료** 후 전체 플로우로 시연하면 그림이 산다(선택).
- 재개 트리거: "노트북에서 못 뽑은 **수평 확장 곡선·HPA**를 수치로 보여줄 때" → 이 문서로 시작.

**체크리스트 (그때)**
- [ ] PC에 k8s 기동(k3d/kind/Docker Desktop) + 매니페스트 이전(이미지 주소만 조정)
- [ ] 시드 + 관측 스택(`monitoring/`) 적용
- [ ] 노트북에 k6 설치, `BASE`를 PC gateway NodePort로
- [ ] 베이스라인 → 부하 유지하며 gateway replica 2→4→6 스케일 → Grafana 곡선 기록
- [ ] HPA 걸고 자동 증식/축소 관찰
- [ ] 병목 이동 지점(reservation/postgres/redis) 식별 + 스케일 → 수치 기록
