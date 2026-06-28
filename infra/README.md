# 🏗️ infra — K8s 기반 인프라

같은 시스템을 **로컬 → 개발서버(개인 Linux 노트북) → AWS** 세 환경에 동일하게 올린다.
핵심 아이디어: K8s base manifest는 하나, 환경 차이는 **Kustomize overlay**로만.

## 디렉터리
```
infra/
├── docker/                 # 로컬 개발용 (compose 한 큐)
│   └── docker-compose.yml  # redis + kafka + zookeeper + postgres + grafana
├── k8s/
│   ├── base/               # 공통 manifest (back/front/redis/kafka/db)
│   └── overlays/
│       ├── local/          # kind/docker-desktop
│       ├── dev/            # k3s (개인 리눅스 노트북)
│       └── aws/            # EKS + 관리형 서비스(ElastiCache/MSK/RDS) 전환
└── loadtest/               # k6 부하 테스트 (전략④)
```

## 환경별 실행

### 1) local — docker-compose
```bash
cd docker && docker compose up -d      # 의존 인프라만 기동
# back/front는 호스트에서 npm run start:dev / dev
```

### 2) local/dev — Kustomize
```bash
kubectl apply -k k8s/overlays/local    # docker-desktop/kind
kubectl apply -k k8s/overlays/dev      # 개인 노트북 k3s
```

### 3) aws — EKS
```bash
# Redis/Kafka/DB는 클러스터 내부 대신 관리형으로 전환:
#   ElastiCache, MSK, RDS → overlays/aws/managed-endpoints.env 로 주입
kubectl apply -k k8s/overlays/aws
```

## 환경 매핑
| | local | dev(k3s) | aws |
|--|-------|----------|-----|
| Redis | 컨테이너 | 컨테이너 | ElastiCache |
| Kafka | 컨테이너 | 컨테이너 | MSK |
| DB | 컨테이너 | 컨테이너 | RDS |
| 노출 | localhost | NodePort | ALB Ingress |
| replicas(back) | 1 | 2 | 4+ (HPA) |
