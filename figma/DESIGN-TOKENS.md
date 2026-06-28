# 디자인 토큰

front `src/styles/tokens.css`와 1:1 매핑. Figma Variables와 동일 값을 유지한다.

## 색상 (Dark theme)
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--color-bg` | #0B0E14 | 배경 |
| `--color-surface` | #161B26 | 카드/패널 |
| `--color-primary` | #4F8CFF | 주요 CTA |
| `--color-success` | #2ECC71 | 입장가능/성공 |
| `--color-warning` | #F5A623 | 대기/주의 |
| `--color-danger` | #FF4D4F | 매진/실패 |
| `--color-text` | #E6E9EF | 본문 |
| `--color-text-muted` | #8A93A6 | 보조 |

## 타이포
| 토큰 | 크기/굵기 |
|------|-----------|
| `--font-display` | 32 / 700 |
| `--font-title` | 22 / 600 |
| `--font-body` | 15 / 400 |
| `--font-caption` | 13 / 400 |
폰트: Pretendard (한글), Inter (숫자/영문)

## 간격 / 라운드
- spacing: 4, 8, 12, 16, 24, 32 (`--space-1`..)
- radius: 8(기본), 16(카드), 999(pill)
