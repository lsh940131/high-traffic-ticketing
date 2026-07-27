# 🏗️ infra — K8s 기반 인프라

같은 시스템을 **로컬 → 노트북 k3s → PC k3d → AWS** 네 환경에 동일하게 올린다.
핵심 아이디어: K8s base manifest는 하나, 환경 차이는 **Kustomize overlay**로만.

## 디렉터리

```
infra/
├── docker/                 # 로컬 개발용 (compose 한 큐)
│   └── docker-compose.yml  # redis + kafka(KRaft) + postgres + minio + prometheus + grafana
├── k8s/
│   ├── base/               # 공통 manifest (앱 6종 + redis·kafka·postgres·minio)
│   ├── overlays/
│   │   ├── local/          # docker-desktop / kind
│   │   ├── dev/            # k3s (개인 리눅스 노트북) — 레지스트리 경유
│   │   ├── pc/             # k3d (PC, 12스레드) — 레지스트리 없이 image import
│   │   └── aws/            # EKS + 관리형(ElastiCache/MSK/RDS) 전환
│   ├── monitoring/         # 애드온: Prometheus + Grafana (파드 단위 스크레이프)
│   └── hpa/                # 애드온: HorizontalPodAutoscaler
└── loadtest/               # k6 부하 테스트 (전략④) + RESULTS.md
```

**애드온을 base에 넣지 않은 이유** — `monitoring`은 앱과 수명주기가 다르고,
`hpa`는 수동 스케일 시연 중에 붙어 있으면 replica를 되돌려버려 측정을 방해한다.
둘 다 필요할 때만 `kubectl apply -k`로 얹는다.

## 환경 매핑

| | local | dev (k3s 노트북) | **pc (k3d)** | aws |
|--|-------|------------------|--------------|-----|
| Redis / Kafka / DB | 컨테이너 | 컨테이너 | 컨테이너 | ElastiCache / MSK / RDS |
| 이미지 전달 | 로컬 데몬 | **레지스트리**(PC→노트북) | **`k3d image import`** | ECR |
| 노출 | localhost | NodePort + Ingress | NodePort | ALB Ingress |
| replicas (gw/queue/resv) | 1 / 1 / 1 | 2 / 2 / 1 | 2 / 2 / 1 | 3 / 4 / 3 |
| 용도 | 개발 | 오버셀 0 검증 | **수평 확장·HPA 측정** | 배포 시나리오 |

`pc`가 레지스트리를 안 쓰는 이유는 빌드와 클러스터가 같은 머신이기 때문이다.
`dev`는 PC에서 빌드해 노트북 클러스터로 보내야 해서 레지스트리가 필요했다.

## 실행

### 1) local — docker-compose (의존 인프라만)

```bash
cd docker && docker compose up -d
# back/front는 호스트에서 실행: back에서 npm run dev
```

### 2) Kustomize — 환경별

```bash
kubectl apply -k k8s/overlays/local    # docker-desktop / kind
kubectl apply -k k8s/overlays/dev      # 노트북 k3s
kubectl apply -k k8s/overlays/pc       # PC k3d
kubectl apply -k k8s/overlays/aws      # EKS — ⚠️ 미검증
```

> `aws` 오버레이는 **실제로 적용해 본 적이 없고 현재 빌드도 실패한다**
> (`replicas-patch.yaml`의 패치 대상에 `namespace`가 없어 base와 매칭 안 됨).
> 관리형 서비스 전환 시나리오를 문서로 남겨둔 것에 가깝다 — 쓰려면 먼저 고쳐야 한다.

### 3) 애드온 (선택)

```bash
kubectl apply -k k8s/monitoring        # Prometheus :30990 · Grafana :30991
kubectl apply -k k8s/hpa               # 자동 스케일 ON
kubectl delete -k k8s/hpa              # 수동 스케일로 복귀
```

## 관측

Prometheus가 앱 5종의 `/metrics`를 **파드 단위**로 긁는다. Service DNS를 static 타겟으로 잡으면
replica가 2개 이상일 때 스크레이프가 임의 파드로 분산돼 카운터가 섞이므로(rate 왜곡),
`kubernetes_sd_configs`(endpoints)로 파드마다 개별 타겟을 잡는다. 이게 없으면 스케일아웃 관찰이 불가능하다.

Grafana 대시보드 "Ticketing — Live (scale-out)"는 k6 지표(remote-write)와 서버 지표를 한 화면에 놓아
**부하 → 포화 → 파드 증설 → 처리량 회복**을 한 번에 보게 한다.

## 부하 테스트

k6 스크립트 3종이 서로 다른 질문에 답한다. 결과는 [`loadtest/RESULTS.md`](./loadtest/RESULTS.md).

| 스크립트 | 질문 |
|---|---|
| `waiting-queue.js` | 스파이크에서 **죽지 않는가** |
| `reservation.js` | **오버셀 0**인가 |
| `scale-out.js` | **replica↑ → 처리량↑** 인가 |

주요 결과 — 오버셀 0(이중 CONFIRMED 0건) · queue-service 1→6 replica에서 **처리량 3.76배**
· 단일 노드 천장 ≈ 1,800 rps. 과정에서 동시성 버그와 L4 로드밸런싱 함정을 각각 하나씩 잡았다.

## 문서

| 문서 | 내용 |
|---|---|
| [`k8s/README-dev.md`](./k8s/README-dev.md) | 노트북 k3s 배포 런북 + 레지스트리 결정 배경 + 함정 |
| [`k8s/dev-infra-overview.md`](./k8s/dev-infra-overview.md) | dev 환경에 실제로 떠 있는 상태 한 장 요약 |
| [`k8s/README-pc.md`](./k8s/README-pc.md) | PC k3d 스케일아웃·HPA 런북 (실측 완료) |
| [`k8s/README-aws.md`](./k8s/README-aws.md) | EKS + 관리형 서비스 전환 메모 |
| [`k8s/monitoring/README.md`](./k8s/monitoring/README.md) | 관측 스택 적용·대시보드 패널 |
| [`k8s/hpa/README.md`](./k8s/hpa/README.md) | HPA 임계·behavior·전제(metrics-server) |
| [`loadtest/README.md`](./loadtest/README.md) | k6 스크립트 3종 · 부하생성기 천장 재는 법 |
| [`loadtest/RESULTS.md`](./loadtest/RESULTS.md) | 부하 테스트 결과 (정본) |
