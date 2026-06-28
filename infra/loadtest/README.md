# 전략④: k6 부하 테스트

티켓 오픈 순간을 재현해 시스템이 죽지 않고, 오버셀이 0인지 수치로 증명한다.

## 실행
```bash
k6 run waiting-queue.js     # 대기열 진입 → 폴링
k6 run reservation.js       # 예매 스파이크 (오버셀 검증)
```

## 보는 지표
- `http_req_duration` p95/p99
- 오버셀 건수 (= 판매 좌석 수 - 실제 재고). 0이어야 성공.
- 대기열 처리량(admit/sec), Kafka consumer lag
