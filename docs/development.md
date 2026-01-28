# Development Guide

## 로컬 실행

```bash
# 인프라 실행
cd infra/docker-compose && docker compose up -d

# 서비스 빌드
./gradlew build -x test

# 서비스 실행
./gradlew :services:auth-service:bootRun       # 8084
./gradlew :services:admin-service:bootRun      # 8080
./gradlew :services:queue-service:bootRun      # 8081
./gradlew :services:ticketing-service:bootRun  # 8082
./gradlew :services:payment-service:bootRun    # 8083
```

## 포트 구성

| 서비스 | API 포트 | Actuator 포트 |
|--------|----------|---------------|
| auth-service | 8084 | 9084 |
| admin-service | 8080 | 9080 |
| queue-service | 8081 | 9081 |
| ticketing-service | 8082 | 9082 |
| payment-service | 8083 | 9083 |

## Health Check

```bash
curl http://localhost:9081/actuator/health
curl http://localhost:9081/actuator/health/liveness
curl http://localhost:9081/actuator/health/readiness
```

---

## TODO

### 기능 개발

- [ ] 각 서비스에 SecurityConfig 작성 (또는 개발 중 비활성화)
- [ ] auth-service: 로그인/토큰 발급/토큰 갱신 API
- [ ] admin-service: 공연/좌석 CRUD API
- [ ] queue-service: 대기열 진입/순번 조회/SSE 알림
- [ ] ticketing-service: 좌석 조회/홀드/주문 처리
- [ ] payment-service: 결제 처리 (PG 모킹)
- [ ] k6 부하 테스트 시나리오 작성

### K8s 운영 시

- [ ] Actuator 포트(9080-9084)는 **ClusterIP**로만 노출 (외부 접근 차단)
- [ ] API 포트(8080-8084)만 Ingress/LoadBalancer로 외부 노출
- [ ] Prometheus가 내부망에서 `/actuator/prometheus` 스크래핑하도록 설정
- [ ] micrometer-prometheus 의존성 추가 (현재 미포함)

```yaml
# K8s Service 예시 - Actuator는 내부망만
apiVersion: v1
kind: Service
metadata:
  name: queue-service-internal
spec:
  type: ClusterIP
  ports:
    - name: actuator
      port: 9081
      targetPort: 9081
---
# K8s Deployment - liveness/readiness probe
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 9081
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 9081
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## 향후 확장 계획

- [ ] AWS 배포 (ECS → EKS 전환)
- [ ] 서비스별 Auto Scaling / HPA 적용
- [ ] Prometheus / Grafana 기반 모니터링
- [ ] 분산 트레이싱 (Jaeger / Zipkin)
