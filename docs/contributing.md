# Contributing

## 브랜치 규칙

| Prefix | 용도 | 예시 |
|--------|------|------|
| `chore/` | 구조/설정/환경 | `chore/bootstrap`, `chore/gradle-config` |
| `feat/` | 기능 개발 | `feat/queue-service`, `feat/seat-hold` |
| `fix/` | 버그 수정 | `fix/redis-connection` |
| `infra/` | Docker, Kafka, Redis, 배포 | `infra/k8s-manifests` |
| `test/` | 부하테스트, 시뮬레이션 | `test/k6-scenarios` |
| `docs/` | 문서 | `docs/api-spec` |

## 커밋 메시지

```
<type>: <subject>

[optional body]
```

**Type**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `chore`: 설정, 빌드, 의존성
- `refactor`: 리팩토링
- `docs`: 문서
- `test`: 테스트

**예시**:
```
feat: add queue entry API
fix: resolve redis connection timeout
chore: add actuator dependency
```

## PR 규칙

- 브랜치에서 작업 후 `master`로 PR
- PR 제목은 커밋 메시지 규칙과 동일
- 리뷰 후 Squash merge 권장
