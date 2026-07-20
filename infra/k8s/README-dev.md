# dev(k3s) 배포 메모 — 개인 리눅스 노트북

`overlays/dev`를 **개인 리눅스 노트북의 k3s**에 올려, k6로 티켓 오픈 스파이크를 재현하고
pod을 늘려가며 아키텍처(가상 대기열·Lua 재고·Kafka)가 부하에서 버티는지 수치로 검증한다.

> 짝 문서: 로컬(docker-compose) = 루트 README, AWS = `README-aws.md`.
> 이 문서는 **AI/사람이 dev 배포를 이어서 할 때 먼저 읽는 작업 문서**다. (루트 `CLAUDE.md`에서 링크)

---

## 결정 / 배경

### 왜 레지스트리 방식으로 이미지를 전달하나 (vs `k3s ctr images import`)
- **push 모델**(build → `docker push` → k8s가 tag로 `pull`)은 AWS **EKS + ECR**과 **완전히 동일한 흐름**이다.
  나중에 AWS로 갈 때 레지스트리 주소(`<PC-IP>:5000` → `<acct>.dkr.ecr...`)만 바꾸면 파이프라인이 그대로 이전된다.
- `ctr images import`(build → `docker save` tar → scp → 노드에서 import)는 **k3s에서만 통하고 AWS로 이어지지 않는다.**
  매 재배포마다 수동 3단계, 멀티노드면 노드마다 반복.
- 이 프로젝트 철학(*base manifest 하나, 차이는 overlay만*)과 같은 논리 → 레지스트리 채택.
- (트레이드오프) 단일 노드 k3s면 `ctr import`로도 스케일 테스트 자체는 된다. 그럼에도 **AWS 흐름을 미리 연습**하려고 레지스트리를 쓴다.

### 왜 지금은 k3s까지만 하고 AWS(EKS)는 보류하나
- k3s와 EKS는 둘 다 Kubernetes라 manifest가 거의 같다. "둘 다 배포했다"는 것 **자체**는 어필이 약하다.
- 어필의 본체는 **부하에서 오버셀 0 / p95 latency를 수치로 증명**하는 것 — 이건 **무료인 k3s에서 충분히 검증 가능**하다.
- EKS+MSK+ElastiCache+RDS를 상시 켜두면 비용이 크다. **k3s에서 반복 검증**하고, AWS는 *필요할 때 짧게 재현*하는 게 비용 대비 합리적.
- 따라서 AWS는 **의도적 스코프 컷**(defer). 재개 트리거: "관리형 전환 + HPA/노드 오토스케일까지 수치로 보여줘야 할 때". 그때 `overlays/aws` + `README-aws.md`로 이어간다.

---

## 토폴로지

```
[Windows PC]  = 빌드 + 레지스트리 + 부하 생성(k6)         [리눅스 노트북] = k3s (단일 노드)
  docker build/push ─┐                                       ┌─ containerd가 pull
  registry:2 (:5000) ─┼──────────  LAN  ──────────┼─ k3s (traefik, metrics-server 내장)
  k6 run  ───────────┘  → NodePort/Ingress로 부하   └─ gateway/queue/reservation/payment/front + redis/kafka/postgres
```

- **PC**: 코딩·이미지 빌드·레지스트리 호스팅·k6 부하 생성. (Docker Desktop 사용)
- **노트북**: **순수 k3s만**. 이미지는 PC 레지스트리에서 pull.
- 클러스터가 외부 레지스트리에서 pull → EKS가 ECR에서 pull하는 구조와 동일(=연습 효과).
- (변형) 레지스트리를 노트북에 둘 수도 있으나, PC에 Docker가 이미 있어 PC 호스팅이 부품이 가장 적다.

---

## 사전 준비

- [ ] 노트북 **IP 고정**(라우터 DHCP 예약 또는 netplan static). 예: `192.168.219.150`
- [ ] PC도 LAN에서 노트북이 닿는 IP. 예: `<PC-IP>` (레지스트리·kubeconfig server 주소로 쓰임)
- [ ] PC → 노트북 **SSH 접속** 확인: `ssh <user>@192.168.219.150`
- [ ] 노트북 배포판 확인(예: Ubuntu 22.04/24.04)

---

## 런북

아래 명령은 별도 표기 없으면 **PC에서** 실행. `ssh <user>@192.168.219.150 '<cmd>'` 로 노트북에 원격 실행.

### 1) k3s 설치 (노트북)
```bash
ssh <user>@192.168.219.150 'curl -sfL https://get.k3s.io | sh -'
# 설치 확인
ssh <user>@192.168.219.150 'sudo k3s kubectl get nodes'
```
k3s는 containerd·kubectl·traefik(ingress)·metrics-server(HPA용)를 함께 설치한다.

### 2) PC에 레지스트리 기동 (PC, Docker)
```bash
docker run -d --restart=always -p 5000:5000 --name registry registry:2
# 방화벽에서 5000 인바운드 허용 필요 (Windows Defender 방화벽)
```

### 3) k3s가 PC 레지스트리를 insecure로 신뢰하게 설정 (노트북)
```bash
ssh <user>@192.168.219.150 'sudo tee /etc/rancher/k3s/registries.yaml >/dev/null <<EOF
mirrors:
  "<PC-IP>:5000":
    endpoint:
      - "http://<PC-IP>:5000"
EOF
sudo systemctl restart k3s'
```

### 4) PC에서 kubectl로 노트북 클러스터를 다루기
```bash
# 노트북의 kubeconfig 가져와 server 주소를 노트북 IP로 치환
ssh <user>@192.168.219.150 'sudo cat /etc/rancher/k3s/k3s.yaml' \
  | sed 's/127.0.0.1/192.168.219.150/' > ~/.kube/config-dev
export KUBECONFIG=~/.kube/config-dev   # PowerShell: $env:KUBECONFIG="$HOME\.kube\config-dev"
kubectl get nodes
```

### 5) 이미지 빌드 & push (PC)
```bash
REG=<PC-IP>:5000
# 백엔드 4개 서비스 (공통 Dockerfile, APP 빌드아규먼트로 선택)
for APP in gateway queue-service reservation-service payment-service; do
  docker build --build-arg APP=$APP -t $REG/ticketing-$APP:dev back/
  docker push $REG/ticketing-$APP:dev
done
# 프론트
docker build -t $REG/ticketing-front:dev front/
docker push $REG/ticketing-front:dev
```
> user-service는 nest-cli/package.json엔 있으나 base manifest엔 아직 없음. 필요 시 base에 추가 후 함께 빌드.

### 6) overlays/dev 배포
`overlays/dev/kustomization.yaml`에 **image transformer**를 추가해 base의 `ticketing-*:latest`를
레지스트리 태그로 덮는다(코드 아래는 예시 — 실제 IP로 채워 커밋):
```yaml
images:
  - { name: ticketing-gateway,             newName: <PC-IP>:5000/ticketing-gateway,             newTag: dev }
  - { name: ticketing-queue-service,       newName: <PC-IP>:5000/ticketing-queue-service,       newTag: dev }
  - { name: ticketing-reservation-service, newName: <PC-IP>:5000/ticketing-reservation-service, newTag: dev }
  - { name: ticketing-payment-service,     newName: <PC-IP>:5000/ticketing-payment-service,     newTag: dev }
  - { name: ticketing-front,               newName: <PC-IP>:5000/ticketing-front,               newTag: dev }
```
```bash
kubectl apply -k infra/k8s/overlays/dev
kubectl -n ticketing get pods -w
# DB 마이그레이션/시드 (postgres pod 뜬 뒤, 최초 1회)
#   → 방식은 back/README·prisma 참고 (kubectl exec 또는 Job)
```

### 7) 접속 확인
```bash
# ingress(traefik) 경유: PC hosts에 "192.168.219.150 ticketing.dev.local" 추가 후
curl http://ticketing.dev.local/api/health   # gateway health (경로는 실제 라우팅 확인)
```

### 8) k6 부하 + pod 스케일 (PC에서 k6 실행)
부하 테스트는 ingress 경로 이슈를 피해 **gateway를 NodePort로 직접** 때리는 게 단순하다.
```bash
# gateway를 NodePort로 노출 (일회성)
kubectl -n ticketing patch svc gateway -p '{"spec":{"type":"NodePort"}}'
kubectl -n ticketing get svc gateway   # 배정된 nodePort 확인 (예: 3xxxx)

# k6 (PC)
k6 run -e BASE=http://192.168.219.150:<nodePort> infra/loadtest/waiting-queue.js
k6 run -e BASE=http://192.168.219.150:<nodePort> infra/loadtest/reservation.js
```
스케일:
```bash
# 수동 스케일 (티켓 오픈 몰림 재현)
kubectl -n ticketing scale deploy/queue-service --replicas=4
kubectl -n ticketing scale deploy/gateway --replicas=3

# 또는 HPA (k3s metrics-server 내장)
kubectl -n ticketing autoscale deploy/queue-service --cpu-percent=70 --min=2 --max=10
kubectl -n ticketing get hpa -w
```
**보는 지표**: k6 `http_req_duration` p95/p99, `http_req_failed`, 오버셀 건수(=판매−재고, 0이어야 함),
대기열 admit/sec, Kafka consumer lag. (Prometheus/Grafana 붙이면 시각화 — 후속)

---

## 현재 상태 / 다음 할 일

**환경 값 (채워넣기)**
- 노트북 IP: `192.168.219.150` (공유기 DHCP 예약 고정 완료)  · SSH: `ssh <user>@192.168.219.150` (user `<미정 — 내일 확인>`)
- 배포판: `<미정 — 접속해 cat /etc/os-release로 확인>` (리눅스 업데이트는 완료됨)  · PC IP(레지스트리): `<미정 — ipconfig로 확인>`
- 방화벽: 공유기 포워딩 불필요(같은 LAN). 노트북 ufw active면 22·6443·30000:32767 허용, PC는 5000 인바운드 허용.
  - `ufw`는 노트북(리눅스) 방화벽. SSH 접속 후 `sudo ufw status`로 **실측** 필요(inactive면 손댈 것 없음).
  - PC 5000 = PC에 띄우는 이미지 레지스트리(창고) 포트. k3s가 여기서 이미지 pull. (= ECR의 로컬 버전)

**진행 체크리스트**
- [x] 노트북 IP 고정 (192.168.219.150)
- [ ] SSH 접속 확인 (user 확정)
- [ ] k3s 설치
- [ ] PC 레지스트리 기동 + 방화벽 5000 허용
- [ ] k3s `registries.yaml` insecure 등록
- [ ] PC로 kubeconfig 가져오기 (`KUBECONFIG=~/.kube/config-dev`)
- [ ] 이미지 5종 빌드 & push
- [ ] `overlays/dev` image transformer 채우고 `kubectl apply -k`
- [ ] DB 마이그레이션/시드
- [ ] 접속 확인 (ingress/NodePort)
- [ ] k6 부하 + pod 스케일 → 수치 기록
- [ ] (후속) Prometheus/Grafana 대시보드
- [ ] (보류) AWS/EKS 재현 — 필요 시 `README-aws.md`

**다음 세션 재개 지점** (마지막 업데이트: 오늘 밤 작업 종료 시점)
- ✅ 완료: 배포 방식 결정(레지스트리 push 모델) + 이 문서·`CLAUDE.md`·`PORTFOLIO.md` 반영, 노트북 IP 고정(192.168.219.150), 노트북 리눅스 업데이트.
- ▶ **내일 여기서 시작**: `ssh <user>@192.168.219.150` 접속 → `cat /etc/os-release`(배포판 확인) → `sudo ufw status`(방화벽 실측) → 런북 **1) k3s 설치** 진행.
- 시작 전 알려줄 값: **노트북 SSH user**, **PC IP**. (레지스트리를 PC 대신 노트북에 둘지 여부도 그때 최종 결정)
