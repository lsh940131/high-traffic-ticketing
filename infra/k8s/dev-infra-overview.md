# dev 배포 인프라 — 한눈에

노트북 k3s에 실제로 떠 있는 상태를 **한 장으로** 정리한 지도. (상세 런북·함정은 [`README-dev.md`](./README-dev.md))

---

## 토폴로지

```
┌──────────────────────────── LAN (192.168.219.0/24) ────────────────────────────┐
│                                                                                 │
│   ┌─────────────── Windows PC (192.168.219.103) ───────────────┐               │
│   │  Docker Desktop                                            │               │
│   │    • registry:2  :5000   ← 이미지 창고 (= ECR 로컬판)       │               │
│   │    • docker build → push                                   │               │
│   │  k6  (부하 생성기)                                          │               │
│   │  kubectl  (~/.kube/config-dev 로 원격 제어)                 │               │
│   └───────────┬───────────────────────────────┬────────────────┘               │
│               │ push 이미지                     │ kubectl / k6 / 브라우저          │
│               │ (localhost:5000)               │                                │
│               ▼                                ▼                                │
│   ┌──────────── Linux 노트북 (192.168.219.150) · Ubuntu 22.04 ────────────────┐  │
│   │  k3s (단일 노드, v1.36.2)   containerd ← pull 192.168.219.103:5000/*:dev  │  │
│   │                                                                          │  │
│   │   ┌────── 외부 노출 ──────┐                                               │  │
│   │   │ traefik Ingress :80  │  ticketing.dev.local                          │  │
│   │   │   /      → front:80  │                                               │  │
│   │   │   /api   → gateway   │                                               │  │
│   │   │ NodePort :30300      │  → gateway:3000   (부하테스트/브라우저 지름길)  │  │
│   │   │ NodePort :30900/1    │  → minio (API/콘솔)                           │  │
│   │   └──────────────────────┘                                               │  │
│   │                                                                          │  │
│   │   namespace: ticketing                                                   │  │
│   │   ┌─────────────── 앱 (내부 ClusterIP) ───────────────┐                   │  │
│   │   │  front  ×1  :80        (React 정적, nginx)         │                   │  │
│   │   │  gateway ×2 :3000  ── 단일 진입점(BFF), 프리픽스 라우팅 ─┐             │  │
│   │   │  queue-service ×2 :3101   ◄─ /queue                 │ │             │  │
│   │   │  reservation-service ×1 :3102 ◄─ /concerts /reservations /orders │  │  │
│   │   │  payment-service ×1 :3103 (Kafka 컨슈머, 비동기 예매)  ◄┘             │  │
│   │   │  (user-service :3104  ◄─ /auth  — 아직 미배포)      │                   │  │
│   │   └───────────────────────────────────────────────────┘                   │  │
│   │   ┌─────────────── 의존성 ───────────────┐                                 │  │
│   │   │  redis  :6379   대기열 ZSET + Lua 재고차감                            │  │
│   │   │  postgres :5432  주문/좌석 (Prisma)                                   │  │
│   │   │  kafka  :9092(broker)/:9093(controller)  비동기 이벤트               │  │
│   │   │  minio  :9000(API)/:9001(콘솔)  포스터 이미지(S3 호환)                │  │
│   │   └──────────────────────────────────────┘                                 │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 접속 주소 (LAN 어디서나)

| 대상 | 주소 | 인증 |
|---|---|---|
| **API (gateway 직접)** | `http://192.168.219.150:30300/concerts` | — |
| front (Ingress) | `http://ticketing.dev.local/` *(hosts에 `192.168.219.150 ticketing.dev.local`)* | — |
| MinIO 콘솔 | `http://192.168.219.150:30901` | `minioadmin` / `minioadmin` |
| MinIO 포스터 | `http://192.168.219.150:30900/posters/<slug>/poster.*` | public read |
| 노트북 SSH | `ssh ubuntu@192.168.219.150` | PC `~/.ssh/id_ed25519` 키 |
| kubectl (PC) | `$env:KUBECONFIG="$HOME\.kube\config-dev"` | — |

> NodePort 범위는 k8s 기본 `30000–32767`. 고정 포트는 매니페스트에 명시(gateway 30300, minio 30900/30901). 공개 서비스라면 이 자리는 **도메인:443 + Ingress**가 대신하고 포트는 URL에서 사라진다.

---

## 요청 흐름 (외부 → 내부)

```
브라우저/k6
   │  http://192.168.219.150:30300/concerts
   ▼
gateway (단일 진입점, BFF)         ← 외부에 노출되는 유일한 백엔드
   │  경로 prefix로 리버스 프록시 (원경로 그대로 전달)
   ├─ /queue/*                 → queue-service:3101
   ├─ /concerts /reservations /orders/* → reservation-service:3102
   └─ /auth/*                  → user-service:3104  (미배포 → 현재 에러)
             │
             ▼  예매 확정 이벤트 (비동기)
        kafka  ──►  payment-service (컨슈머)
```
- **백엔드 서비스는 전부 ClusterIP = 클러스터 내부 전용.** 외부는 gateway·front만 닿는다(의도된 경계).
- 각 서비스의 `/docs`(Swagger)는 프록시 대상이 아니며 운영 기본 off(`NODE_ENV=production`). 볼 땐 해당 서비스를 `kubectl port-forward`.

---

## 이미지 파이프라인 (EKS+ECR 흐름 연습)

```
PC:  docker build --build-arg APP=<svc> -t 192.168.219.103:5000/ticketing-<svc>:dev back/
     docker tag  … localhost:5000/ticketing-<svc>:dev   (Docker Desktop HTTPS 이슈 우회)
     docker push localhost:5000/ticketing-<svc>:dev      (같은 레지스트리 컨테이너)
                     │
k3s: containerd  ──► pull 192.168.219.103:5000/ticketing-<svc>:dev
     (registries.yaml 에 insecure http 등록)
```
- 이미지 5종: `ticketing-{gateway,queue-service,reservation-service,payment-service,front}:dev`
- `:dev` 태그는 고정이라 재빌드 후 재pull하려면 → `k3s ctr images rm <img>` + `kubectl rollout restart` (상세는 런북).

---

## 데이터 초기화

- **마이그레이션**: `prisma migrate deploy` (파드에 `prisma.config.ts` 주입 후 실행) — 6개 적용.
- **시드**: PC에서 `postgres` port-forward + `MINIO_ENDPOINT=http://192.168.219.150:30900` 로 `npm run seed`.
  → 공연장 2 · 좌석 4,640 · 공연 10 · 티켓 23,200 · 유저 3, 포스터 MinIO 업로드.

---

## 상태 확인 치트시트 (PC, kubeconfig 잡은 뒤)

```powershell
kubectl -n ticketing get pods         # Running / RESTARTS 0
kubectl -n ticketing get deploy       # READY 원하는수=실제수
kubectl -n ticketing top pods         # CPU/메모리 (metrics-server)
kubectl -n ticketing logs deploy/gateway --tail=30
kubectl -n ticketing get events --sort-by=.lastTimestamp | tail
```
빠른 E2E: `curl http://192.168.219.150:30300/concerts` → 공연 10개 JSON.
