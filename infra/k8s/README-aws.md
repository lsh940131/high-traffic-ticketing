# AWS 배포 메모

base의 redis/kafka/postgres는 데모용. 운영에서는 관리형으로 전환:
- Redis → ElastiCache
- Kafka → MSK
- PostgreSQL → RDS

`overlays/aws/managed-endpoints.env`에 실제 엔드포인트를 주입하고,
시크릿(JWT/DB 비번)은 AWS Secrets Manager + External Secrets Operator로 주입 권장.
ALB Ingress Controller, EKS, IRSA 설정 필요.
