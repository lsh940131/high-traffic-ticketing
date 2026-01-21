# 🎫 high-traffic-ticketing
대규모 트래픽 환경에서 안정적인 티켓 예약을 처리하기 위한 실전형 티켓팅 시스템입니다.  
대기열(Queue), 입장 제어(Admission Control), 지정좌석 동시성 처리, 이벤트 기반 결제 흐름을 중심으로 설계·구현합니다.

본 프로젝트는 기능의 풍부함보다
👉 “대용량 트래픽을 어떻게 제어하고, 시스템을 어떻게 보호하는가”에 초점을 둔 포트폴리오용 프로젝트입니다.

## 🎯 프로젝트 목표
- 대기열을 통한 사전 트래픽 차단
- 허용된 사용자만 티켓팅 서버에 진입
- 다중 서버 환경에서도 지정좌석 중복 예약(오버셀) 0건
- 결제 성공/실패에 따른 좌석 상태의 일관성 보장
- 로컬 환경에서 실전 구조 재현 후, AWS + CI/CD로 확장 가능하도록 설계

## 🧱 아키텍처 개요
서비스 구성 (Monorepo 기반 MSA)

| 서비스                   | 설명                      | 인스턴스 |
| --------------------- | ----------------------- | ---- |
| **queue-service**     | 대기열 관리, 순번 계산, 입장 토큰 발급 | 2    |
| **ticketing-service** | 좌석 조회, 좌석 홀드, 주문 처리     | 2    |
| **payment-service**   | 결제 처리 (PG 연동은 모킹)       | 1    |
| **admin-service**     | 공연/좌석 관리 (운영용)          | 1    |

- 모든 서비스는 독립 실행·독립 배포 가능
- 하나의 레포(monorepo)에서 서비스별 CI/CD 구성

## 🚦 핵심 설계 포인트
1. Queue 기반 입장 제어
- 티켓팅 서버 보호를 위해 대기열을 시스템 최전방에 배치
- 사용자는 반드시 queue-service를 통해 **입장 토큰(queueToken)**을 발급받아야 함
- 토큰 없는 요청은 ticketing-service에서 즉시 차단

2. 실시간 + 안정적인 대기열 처리
- 순번 확인: 폴링 + 백오프(backoff) 방식으로 Redis 부하 제어
- 입장 허용 시점: SSE(Server-Sent Events) 로 즉시 알림
- 즉시성 + 안정성을 동시에 확보하는 하이브리드 구조

3. 지정좌석 동시성 제어 (오버셀 방지)
- 좌석은 1좌석 = 1 Redis 키로 관리
- Redis 원자 연산을 이용해 좌석 홀드 처리  
```text
AVAILABLE → HELD (TTL) → SOLD
```
- ticketing-service 인스턴스가 여러 대여도 중복 예약 발생하지 않음

4. 이벤트 기반 결제 처리
- 결제는 payment-service에서 처리 (PG는 모킹)
- 결제 결과를 Kafka 이벤트로 발행
- ticketing-service는 이벤트를 소비하여 좌석 확정/해제 처리
- 서비스 간 강결합 제거

## 🗄️ 데이터 저장소 구성
| 용도       | 기술                   |
| -------- | -------------------- |
| Queue 상태 | Redis (Queue 전용)     |
| 좌석 홀드/확정 | Redis (Seat/Hold 전용) |
| 티켓팅 데이터  | PostgreSQL           |
| 결제 데이터   | PostgreSQL           |
| 이벤트 스트림  | Kafka                |
- Queue 트래픽 폭주가 좌석 정합성 처리에 영향을 주지 않도록 Redis를 분리 설계

## 🛠️ 기술 스택
**Backend**
- Java 17
- Spring Boot 3.x
- Spring Web, Spring Data JPA
- Redis
- Kafka
- PostgreSQL

**Infra / DevOps**
- Docker, Docker Compose (로컬)
- Nginx / Ingress (라우팅, LB)
- GitHub Actions (CI/CD)
- (확장 예정) AWS ECS / EKS

**Communication**
- REST API
- Server-Sent Events (SSE)
- Event-driven Architecture

**Load Test**
- k6
- 대기열 폭주 / 좌석 경쟁 시나리오 테스트

## 📂 레포 구조
```text
high-traffic-ticketing/
  services/
    queue-service/
    ticketing-service/
    payment-service/
  infra/
    docker-compose/
  loadtest/
    k6/
  docs/
```

## 🚀 이 프로젝트에서 보여주고 싶은 것
- 단순 CRUD가 아닌 트래픽 제어 중심의 시스템 설계
- 수평 확장 환경에서의 동시성 문제 해결
- Queue → Admission → Seat Hold → Payment → Event 흐름의 이해
- 실무에서 발생하는 병목을 구조적으로 해결하는 사고 방식

## 🔮 향후 확장 계획
- AWS 배포(ECS → EKS)
- 서비스별 Auto Scaling / HPA 적용
- Prometheus / Grafana 기반 모니터링

## 🌿 작업 브랜치 규칙
- chore/ : 구조/설정/환경
- feat/ : 기능
- infra/ : docker, kafka, redis, 배포
- test/ : 부하테스트, 시뮬레이션
- docs/ : 문서chore/ : 구조/설정/환경