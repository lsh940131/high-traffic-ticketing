# 브랜치 전략

솔로 프로젝트 기준 단순화한 전략.

| 브랜치 | 역할 | 배포 |
|--------|------|------|
| `master` | 릴리스/프로덕션. **완성 후 한 번 배포**하는 대상 | 배포 트리거 |
| `develop` | 통합·일상 작업 브랜치. 모든 기능이 여기로 모임 | dev 서버(선택) |
| `feature/*` | 큰 기능 단위 작업 (선택). `develop`에서 분기 | — |
| `legacy/spring-boot` | 과거 Spring 버전 보존용 | — |

## 흐름
```
feature/seat-map ─┐
feature/event-api ─┼─▶ develop ──(완성)──▶ master ──▶ 배포
                   ┘
```

> 커밋 메시지는 `scope(type): 제목` 형식이 **강제**된다(commitlint + husky).
> `feat: ...`처럼 scope가 없으면 훅에서 거부된다 — 양식은 [`../COMMIT_CONVENTION.md`](../COMMIT_CONVENTION.md).

## 일상 작업 (develop)
```bash
git checkout develop
# ... 작업 ...
git add -A
git commit -m "queue(feat): 대기열 진입 토큰 발급 API 추가"
git push origin develop
```

## 기능 브랜치 (선택)
```bash
git checkout develop
git checkout -b feature/seat-map
# ... 작업 후 ...
git checkout develop
git merge --no-ff feature/seat-map
git branch -d feature/seat-map
```

## 릴리스 (전부 끝나면 master로)
```bash
git checkout master
git merge --no-ff develop
git tag v1.0.0
git push origin master --tags     # 여기서 배포 파이프라인 동작
```
