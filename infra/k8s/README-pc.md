# PC 단일 노드 — 수평 확장 곡선 + HPA 라이브 시연 (런북)

노트북(4코어) k3s에서 **오버셀 0**은 증명했지만, 노드 CPU가 먼저 포화라
**"replica↑ → 처리량↑" 수평 확장 곡선**은 못 뽑았다. 자원이 넉넉한 **PC로 클러스터를 옮겨**,
Grafana로 실시간 관찰하며 **파드를 늘리면 처리량이 오르고 지연이 떨어지는 것**을 눈으로 보여준다.

> **✅ 2026-07-27 수행 완료.** queue-service 1→6 replica에서 **처리량 3.76배(494 → 1,858 rps),
> 왕복 p95 14배 개선(8.64s → 607ms)**. HPA 자동 증식·축소 관찰. 노드 천장 ≈ 1,800 rps 확인.
> 과정에서 **L4 Service + keep-alive로 스케일아웃이 무효화되는 버그**를 발견·수정했다.
> 수치는 [`../loadtest/RESULTS.md`](../loadtest/RESULTS.md) "환경 B — 시나리오 ③".
> 아래는 그때 쓴 런북이며 재현·재측정 시 그대로 따라가면 된다.

> 짝 문서: 노트북 k3s = [`README-dev.md`](./README-dev.md), AWS = `README-aws.md`.
> 관련: [`hpa/README.md`](./hpa/README.md) · [`monitoring/README.md`](./monitoring/README.md) · [`../loadtest/RESULTS.md`](../loadtest/RESULTS.md)

---

## 왜 PC인가 (노트북 대비)

| | 노트북 (기존 클러스터) | **PC (Ryzen 5 7600)** |
|---|---|---|
| CPU | 4코어 | **6코어 / 12스레드** (~3배) |
| RAM | ~8GB | **31GB** (~4배) |
| Docker/WSL2 | — | 12코어 · 15GB 할당(`.wslconfig`로 상향 가능) |

- **핵심 이득**: 남는 코어가 생겨, Node.js(프로세스당 1코어) 서비스의 replica를 늘리면
  **새 파드가 놀던 코어를 실제로 차지** → 처리량이 오른다. 노트북에선 코어가 꽉 차 안 보이던 그림.

## 토폴로지 — 기존과 **반대로 뒤집기**

부하생성기와 대상이 같은 머신이면 측정이 오염된다. 그래서 **더 큰 PC가 클러스터(대상)**,
**노트북이 부하(k6)**를 맡아 물리 분리한다.

```
[노트북]  k6 부하 생성  ──LAN──►  [PC]  k3d(k3s) 클러스터 (6코어/31GB)
 (기존 PC↔노트북 역할을 스왑)            gateway·queue·reservation·payment·user·front
      │                                  + redis·postgres·kafka·minio
      └── k6 remote-write ──────────────►  + prometheus(:30990)·grafana(:30991)
```

| 용도 | 주소 | 방향 |
|---|---|---|
| gateway (부하 대상) | `http://<PC-IP>:30300` | 노트북 → PC |
| front (전체 플로우 시연) | `http://<PC-IP>:30080` | 노트북 → PC |
| Prometheus (k6 remote-write 수신) | `http://<PC-IP>:30990` | 노트북 → PC |
| Grafana (관찰) | `http://<PC-IP>:30991` | 어디서든 |
| MinIO API (포스터 이미지) | `http://<PC-IP>:30900` | 브라우저 → PC |

---

## 왜 k3d인가 (레지스트리 없이)

- **노트북과 동일한 k3s** → `base`/overlay 매니페스트를 그대로 재사용.
- **metrics-server 내장** → HPA가 추가 설치 없이 동작. (Docker Desktop 쿠버네티스는 미포함이라 별도 설치 필요)
- **레지스트리 불필요** — 빌드도 클러스터도 같은 PC다. `k3d image import`로 로컬 이미지를 노드에 직접 밀어넣는다.
  `overlays/dev`가 `<PC-IP>:5000/...` 레지스트리를 쓴 건 PC에서 빌드해 **노트북** 클러스터로 보내야 했기 때문이고,
  토폴로지를 뒤집으면 그 이유가 사라진다. → `overlays/pc`는 `newName` 없이 태그만 `:pc`.

---

## 1) 클러스터 기동 (PC)

```powershell
choco install k3d      # 또는: winget install k3d
```

```bash
k3d cluster create ticketing \
  --servers 1 --agents 0 \
  -p "30300:30300@server:0" \
  -p "30080:30080@server:0" \
  -p "30900:30900@server:0" \
  -p "30990:30990@server:0" \
  -p "30991:30991@server:0" \
  --k3s-arg "--disable=traefik@server:0"     # NodePort만 쓰므로 traefik은 CPU 낭비

kubectl config use-context k3d-ticketing
kubectl get nodes
kubectl top nodes          # metrics-server 살아있는지 확인 (HPA 전제)
```

**NodePort는 클러스터 생성 시 매핑해야 한다.** 나중에 추가하려면 클러스터를 다시 만들어야 하므로
위 5개 포트를 한 번에 열어둔다.

방화벽 — **보통 불필요하다.** Docker Desktop이 게시(publish)한 포트에 대한 허용 규칙을 이미 넣어둬서,
실측에서 노트북→PC 30300·30990·30991 TCP 연결이 그대로 됐다. 막힐 때만 (관리자 PowerShell):
```powershell
New-NetFirewallRule -DisplayName "k3d ticketing" -Direction Inbound -Protocol TCP `
  -LocalPort 30300,30080,30900,30990,30991 -Action Allow
```
> PC는 기본적으로 ICMP를 막으므로 **`ping`이 100% 손실이어도 연결 문제가 아니다.** TCP로 확인할 것:
> `timeout 3 bash -c 'echo > /dev/tcp/<PC-IP>/30300'`

> ⚠️ **WinNAT 포트 선점 주의** — 재부팅 후 WinNAT가 포트를 동적 예약해 Docker bind가 실패한 전례가 있다.
> 실패 시 `netsh interface ipv4 show excludedportrange protocol=tcp`로 확인하고, 필요하면
> 30300·30080·30900·30990·30991를 영구 예약(`netsh int ipv4 add excludedportrange ... store=persistent`).

## 2) 이미지 빌드 + 클러스터로 import (PC)

```bash
# 백엔드 5개 (공통 Dockerfile, APP 빌드아규먼트로 선택)
for APP in gateway queue-service reservation-service payment-service user-service; do
  docker build --build-arg APP=$APP -t ticketing-$APP:pc back/
done
docker build -t ticketing-front:pc front/

k3d image import -c ticketing \
  ticketing-gateway:pc ticketing-queue-service:pc ticketing-reservation-service:pc \
  ticketing-payment-service:pc ticketing-user-service:pc ticketing-front:pc
```

> 코드 수정 후 재배포: 다시 build → import → `kubectl -n ticketing rollout restart deploy/<name>`.
> 태그가 `:pc`로 고정이라 `:latest`처럼 pull을 시도하지 않는다(overlay가 `imagePullPolicy: IfNotPresent` 명시).

## 3) 배포

```bash
kubectl apply -k infra/k8s/overlays/pc      # 앱 + 인프라 (HPA 없이, 수동 스케일 단계용)
kubectl apply -k infra/k8s/monitoring       # prometheus + grafana
kubectl -n ticketing get pods -w
```

Prometheus 타겟 확인 — `http://<PC-IP>:30990/targets` 에 **파드마다 한 줄씩** 떠야 한다.
(Service DNS 한 줄만 보이면 구버전 설정. `monitoring/prometheus.yaml`이 endpoints 디스커버리인지 확인)

## 4) 마이그레이션 + 시드 (PC, 최초 1회)

PC 안에서 다 돌아가니 노트북 때보다 단순하다 — postgres를 로컬로 port-forward해 `back/`에서 실행.

```bash
kubectl -n ticketing port-forward svc/postgres 15432:5432 &

cd back
DATABASE_URL=postgresql://ticket:ticket@localhost:15432/ticketing npx prisma migrate deploy
# 시드는 MinIO에 포스터를 올리고 그 주소를 DB에 저장한다 → 브라우저가 닿는 주소로 넣어야 함
DATABASE_URL=postgresql://ticket:ticket@localhost:15432/ticketing \
MINIO_ENDPOINT=http://<PC-IP>:30900 npm run seed
```

- 시드 내용: 공연 10개(각 스탠딩 1,000장) · 부하 유저 5,000명(`load-<i>@ticketing.dev`).
- **`emptyDir`라 클러스터/파드 재생성 시 데이터가 날아간다** → 재시드 필요. (영속이 필요하면 PVC)

## 5) 노트북에서 부하

**먼저 노트북의 k3s를 내린다.** 예전 클러스터가 그대로 돌고 있으면 4코어 중 절반을 먹는다
(실측: load average 1.87 → 0.51, 메모리 2,455MB → 868MB).
```bash
ssh -t ubuntu@<노트북-IP> 'sudo /usr/local/bin/k3s-killall.sh && sudo systemctl disable k3s'
```
> sudo 프롬프트 때문에 **TTY가 있는 터미널**에서 실행해야 한다.

```bash
# 노트북: k6 설치(sudo 불필요) 후 리포의 infra/loadtest 에서
#   curl -sfL -o k6.tar.gz https://github.com/grafana/k6/releases/download/v2.1.0/k6-v2.1.0-linux-amd64.tar.gz
#   tar xzf k6.tar.gz && cp k6-v2.1.0-linux-amd64/k6 ~/bin/k6
export BASE=http://<PC-IP>:30300
export JWT_SECRET=dev-notebook      # overlays/pc 의 back-secret 과 동일해야 함
export K6_PROMETHEUS_RW_SERVER_URL=http://<PC-IP>:30990/api/v1/write
export K6_PROMETHEUS_RW_TREND_STATS="p(95),p(99),avg"

k6 run -o experimental-prometheus-rw -e BASE=$BASE -e VUS=400 -e DURATION=10m scale-out.js
```

Grafana `http://<PC-IP>:30991` → **"Ticketing — Live (scale-out)"** 대시보드가 5s마다 갱신된다.

### 5-1) 부하생성기 천장 먼저 재기 (건너뛰지 말 것)

노트북은 4코어다. **k6가 먼저 한계에 닿으면 PC가 아직 여유가 있는데도 곡선이 평평해진다** —
하필 증명하려는 지점에서 측정이 무너진다. 본 측정 전에 천장을 확인한다.

```bash
kubectl -n ticketing scale deploy/gateway --replicas=6        # 스케일 대상을 미리 최대로
kubectl -n ticketing scale deploy/queue-service --replicas=4
k6 run -o experimental-prometheus-rw -e BASE=$BASE -e MODE=calibrate -e VUS=1200 scale-out.js
```

- RPS가 평평해질 때 Grafana의 **서버 CPU가 포화가 아니면 → 노트북이 천장**. (노트북에서 `top`으로
  k6 프로세스가 ~400%에 붙었는지 같이 확인)
- 본 측정 VU는 이 천장 **아래**로 잡는다. 천장이 모자라면 replica 상한을 낮춰
  곡선을 온전히 뽑는 게, 상한까지 갔다가 평평해진 걸 변명하는 것보다 낫다.
- 측정한 천장값은 `RESULTS.md`에 같이 적는다(측정의 유효 범위이므로).
- **이때 서비스별 CPU를 보고 병목을 확정한다.** 실측(2026-07-27)에선 k6 128%/400%,
  gateway 3.55/6코어, **queue-service 3.94/4코어** → 병목은 queue-service, 노트북은 여유 3배였다.

---

## 시연 시나리오 (머니 샷)

### A. 수동 스케일 — "replica↑ → 처리량↑" 곡선

**스케일 대상은 gateway가 아니라 `queue-service`다.** 실측에서 이 워크로드(대기열 enter+status)의
병목은 queue-service였고 gateway는 6파드에서도 59%밖에 안 썼다. 병목이 아닌 걸 늘리면 곡선이 안 움직인다.
→ 5-1의 캘리브레이션으로 **그때의 병목을 먼저 확인**하고 그것을 늘릴 것.

```bash
kubectl -n ticketing scale deploy/queue-service --replicas=N   # 1 → 2 → 3 → 4 → 6
```

측정은 **단계마다 k6를 90초씩 독립 실행**하고 각 런의 자체 요약을 쓴다. 부하를 켜 둔 채 스케일하며
Grafana만 보는 것도 되지만, remote-write 경유 지표는 과소보고돼서 **기록용 수치로는 부적합**하다.
스케일 후에는 커넥션 회전 주기(`UPSTREAM_AGENT_TTL_MS`, 기본 30s)를 넘겨 대기해야 새 파드로 재분배된다.

Grafana에서 볼 것 (★ 표시 패널):

| 패널 | 기대 |
|---|---|
| ★ 파드 수 / service | 1 → 2 → 3 → 4 → 6 계단식 상승 |
| ★ CPU / 파드 | **선이 늘어나고 각 선의 높이는 내려감** (일이 분산됨) |
| CPU 합계 / service | 총합은 올라감 (놀던 코어를 새 파드가 차지) |
| ★ k6 처리량(RPS) | 올라감 |
| ★ k6 p95 지연 | 내려감 |
| Event-loop lag p99 | 내려감 (포화 해소) |

> ⚠️ **새 파드가 노는지부터 확인할 것.** `CPU / 파드` 패널에서 신규 파드가 0에 붙어 있으면
> 스케일이 아니라 **커넥션 분배**가 문제다. k8s Service는 L4라 커넥션을 맺는 순간에만 파드를 고르고,
> HTTP keep-alive가 그 커넥션을 계속 재사용하기 때문에 스케일아웃해도 새 파드가 트래픽을 못 받는다.
> 이 리포는 gateway 쪽에 커넥션 풀 회전(`UPSTREAM_AGENT_TTL_MS`)을 넣어 해결했다.
> 상세는 `../loadtest/RESULTS.md`의 "부하테스트가 발견한 버그 (2)".

곡선이 평평해지면 둘 중 하나다 — **병목이 옮겨갔거나**(CPU 합계 패널에서 다음으로 치솟는 서비스를 찾아
그쪽을 스케일), **노드 천장**이거나(`kubectl top node`가 80%대면 이쪽. 실측 천장 ≈ 1,800 rps).

### B. HPA — 자동 증식/축소

수동 시연이 끝난 뒤 얹는다(먼저 걸면 HPA가 `kubectl scale`을 되돌린다).

```bash
kubectl apply -k infra/k8s/hpa
kubectl -n ticketing get hpa -w      # TARGETS(현재%/목표%) · REPLICAS
```

부하를 올리면 **파드가 스스로 증식**, 부하가 빠지면 60s 뒤부터 축소되는 것까지 라이브로.
임계·behavior 설명은 [`hpa/README.md`](./hpa/README.md).

```bash
kubectl delete -k infra/k8s/hpa      # 다시 수동 모드로
```

실측(2026-07-27) 타임라인: 부하 후 40초에 목표 초과 감지 → 60초에 2→5파드 → 100초에 queue가 max=8 →
120초에 gateway가 **6파드 / 67%에서 균형점 안착**. 부하 종료 후 95초에 축소 시작, 30초당 1파드.

> **HPA가 만능이 아닌 지점도 같이 보여줄 것.** HPA는 파드당 CPU 사용률만 보므로,
> 노드 천장에 닿아 파드를 늘려도 처리량이 안 느는 상황을 감지하지 못한다. 실측에서 queue-service를
> max=8까지 밀었지만 6개 이후로는 처리량 증가 없이 노드 CPU만 80%→85%로 올랐다.

### C. 기록

`../loadtest/RESULTS.md` "환경 B — 시나리오 ③"에 결과를 적는다. 측정 항목:
성공 처리량 · p95(요청/왕복) · 실패율 · 서비스별 CPU · **활성 파드 수**(신규 파드가 노는지 확인용) · 노드 CPU.

> 실패율이 단계마다 다르면 **성공 처리량**으로 비교할 것 — 실패 요청은 503을 빨리 뱉어 RPS를 부풀린다.

---

## 한계 (정직하게)

- **단일 노드 천장은 여전함**: 실측 ≈ **1,800~1,850 req/s**(노드 CPU 80%)에서 평평해진다.
  queue-service를 6→8로 늘려도 처리량은 오히려 -4%, 노드만 85%로 오른다. 진짜 무한 수평확장·
  **노드 오토스케일**은 멀티노드/클라우드(EKS) 영역 — 그건 `README-aws.md`로.
- **병목은 이동한다**: 이 워크로드(대기열)의 병목은 queue-service였다. 다른 워크로드(예매)면
  reservation·postgres 커넥션·redis(싱글스레드)로 옮겨간다.
  → "병목을 찾아 늘리고, 옮겨가는 걸 관찰"하는 것 자체가 좋은 데모.
- **L4 로드밸런싱 + keep-alive**: 스케일아웃해도 새 파드가 트래픽을 못 받는 함정.
  커넥션 풀 회전으로 덮었지만 재분배까지 최대 TTL(기본 30s)이 걸린다. 정석은 L7 로드밸런싱.
- **requests 상향의 대가**: `overlays/pc`가 스케일 대상 3종의 requests를 500m으로 올린다(HPA 임계를
  의미 있게 만들기 위해). 그만큼 스케줄 가능한 총 파드 수는 줄어든다 — gateway max 8이면 4000m 예약.
- **부하생성기(k6) 측 한계**: 아주 큰 부하(수천~만 VU)에선 **노트북 4코어 k6**도 한계가 올 수 있다.
  그땐 k6쪽 CPU도 같이 관찰(k6 요약의 dropped iterations).
- **관측 자체도 부하**: Prometheus가 파드 단위로 5s마다 긁으므로 파드가 늘면 스크레이프도 는다. PC 여유로는 무시 가능.

---

## 체크리스트 (2026-07-27 완료)

- [x] k3d 클러스터 기동 + NodePort 5개 매핑 (방화벽 규칙은 불필요했음)
- [x] 이미지 6종 `:pc` 빌드 → `k3d image import`
- [x] `overlays/pc` + `monitoring` 적용, Prometheus `/targets`에 파드별 타겟 확인
- [x] 마이그레이션 + 시드 (공연 10 · 티켓 23,200 · 유저 5,003)
- [x] 노트북 k3s 종료 + k6 v2.1.0 설치, PC gateway로 부하 → Grafana 수신 확인
- [x] 부하생성기 천장 확인 (k6 128%/400% = 여유 3배, 병목은 queue-service)
- [x] 곡선: queue-service 1→6 replica, **처리량 3.76배 · 왕복 p95 14배 개선**
- [x] **버그 발견·수정**: L4 Service + keep-alive로 스케일아웃 무효화 → 커넥션 풀 회전
- [x] `hpa/` 적용, 자동 증식/축소 관찰 (gateway 6파드/67% 균형점)
- [x] 노드 천장 확인 (≈1,800 rps, queue 8파드는 무의미)
- [x] `RESULTS.md`에 결과 추가 (환경 B · 시나리오 ③)

### 남은 것

- [ ] queue=2 실패율 이상치(29.79%) 규명 — 재시도 증폭 가설 검증(재시도 끄고 재측정)
- [ ] 예매 경로(`reservation.js`)로도 스케일아웃 측정 → 병목이 reservation·postgres로 이동하는지 확인
- [ ] L7 로드밸런싱(서비스 메시) 도입 시 커넥션 풀 회전 제거 가능
