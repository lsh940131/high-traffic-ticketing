# 이력서/포트폴리오용 요약

## 프로젝트 한 줄 소개
**High-Traffic Ticketing** — 콘서트 티켓 오픈처럼 순간 트래픽이 폭증하는 상황을 견디는 티케팅 시스템. 기획(Figma)·프론트(React)·백엔드(NestJS)·인프라(K8s)를 한 레포에 단독 설계·구현.

## 이력서 붙여넣기용 (3줄)
- Redis Sorted Set 기반 **가상 대기열**과 입장 토큰(JWT)으로 백엔드 유입량을 정원만큼 제어해 트래픽 스파이크를 흡수.
- Redis **Lua 원자 연산 + 분산락**으로 재고 동시성을 제어해 좌석 오버셀(초과 판매)을 차단, DB 유니크 제약으로 2차 방어.
- **Kafka** 비동기 예매 파이프라인으로 결제·DB I/O를 분리(load leveling), **k6 부하 테스트 + Grafana**로 성능을 수치 검증. K8s(Kustomize)로 local/dev/AWS 동일 배포.

## 강조 포인트 (면접 대비)
- **왜 대기열인가**: DB/앱을 직접 때리지 않게 하는 댐. ZRANK로 O(log N) 순번, FIFO 공정성.
- **왜 Redis Lua인가**: check-then-act 경합 제거. 비관적 락의 커넥션 고갈/데드락 회피.
- **왜 Kafka인가**: 요청과 확정 분리. 파티션 수 = 처리 병렬도. 멱등성으로 at-least-once 대응.
- **환경 전략**: base manifest 1개 + Kustomize overlay로 local→dev(k3s 노트북)→AWS(EKS+ElastiCache/MSK/RDS) 차이만 덮어씀.
- **의도적 스코프 컷**: PG 결제 mock, 멀티리전 제외 — "트래픽 처리" 핵심에 집중(README에 명시).
- **부하 검증은 k3s에서, AWS는 defer**: 오버셀 0·p95 latency 증명은 무료인 k3s 노트북에서 완료하고, EKS는 비용 대비 오버라 *필요 시 짧게 재현*(관리형 전환 + HPA/노드 오토스케일 시연). 배포 파이프라인은 레지스트리 push 모델로 통일해 EKS+ECR로 그대로 이전 가능. (근거·런북: `infra/k8s/README-dev.md`)

## 데모 스크린샷 후보
1. Grafana 대시보드: 스파이크 전/후 p95 latency, consumer lag
2. k6 결과: 오버셀 0건 + p95 < 800ms
3. 대기열 화면(S2): 순번/예상시간 진행바

## 링크 (작성 후 채우기)
- GitHub: `github.com/<you>/high-traffic-ticketing`
- Figma: (figma/README.md에 링크)
- 데모 영상/배포 URL: (선택)
