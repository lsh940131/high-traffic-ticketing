# 디자인 토큰

역할(semantic) 기반 토큰 + 테마별 값 2벌(dark/light). front `src/styles/tokens.css`와 1:1, Figma Variables도 동일하게 모드 2개로 구성.

> 핵심 원칙: 컴포넌트는 `--color-*` 역할 토큰만 참조한다. 테마 전환은 값만 교체(`data-theme`)되며 컴포넌트는 안 바뀐다.
> 주의: 라이트는 다크의 단순 반전이 아니다. success/warning 등은 흰 배경 대비를 위해 더 진한 값을 쓴다.

## 색상 (역할별 · dark / light)
| 토큰 | dark | light | 용도 |
|------|------|-------|------|
| `--color-bg` | #0B0E14 | #F7F8FA | 페이지 배경 |
| `--color-surface` | #161B26 | #FFFFFF | 카드/패널 |
| `--color-surface-2` | #1E2533 | #EEF1F6 | 한 단계 올라온 면 |
| `--color-border` | #2A2F3A | #E2E6ED | 경계선 |
| `--color-primary` | #5B6CF0 | #4A57D6 | 주요 CTA (인디고) |
| `--color-on-primary` | #FFFFFF | #FFFFFF | primary 위 텍스트 |
| `--color-success` | #2ECC71 | #1B9E54 | 입장가능/성공 |
| `--color-warning` | #F5A623 | #B26A00 | 대기/주의 |
| `--color-danger` | #FF4D4F | #E03131 | 매진/실패 |
| `--color-text` | #E6E9EF | #1A1D24 | 본문 |
| `--color-text-muted` | #8A93A6 | #5F6878 | 보조 |

상태 배지는 해당 색을 15% 알파 배경 + 원색 텍스트로 사용(`color-mix` 또는 사전 정의 알파 토큰).

## 타이포
| 토큰 | 크기/굵기 |
|------|-----------|
| `--font-display` | 32 / 700 |
| `--font-title` | 22 / 600 |
| `--font-body` | 15 / 400 |
| `--font-caption` | 13 / 400 |
폰트: Pretendard (한글), Inter (숫자/영문)

## 간격 / 라운드
- spacing: 4, 8, 12, 16, 24, 32 (`--space-1`..`--space-8`)
- radius: 8(기본), 16(카드), 999(pill)

## 테마 전환
- 웹: `<html data-theme="dark|light">`. 기본 dark, 시스템 설정 따라 자동 + 수동 토글 가능.
- Figma: Variables를 Mode 2개(Dark/Light)로 만들고 컴포넌트는 변수 참조.
