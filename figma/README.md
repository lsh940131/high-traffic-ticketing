# 🎨 figma — UI·UX 기획

"딱 필요한 만큼"의 화면만 정의한다. 티케팅의 본질 플로우(**대기열 → 좌석 → 주문 → 결제 결과**)에 집중하고,
부수 화면은 최소한으로 남긴다.

**Figma 파일** — <https://www.figma.com/design/Lu8ZeOb13XwyxS6RAc8K0P/ticketing> (열람 공개)

이 폴더의 문서는 Figma와 코드를 잇는 **단일 진실 소스(SSOT)**다. 값·스펙은 각 문서에만 두고
서로 복제하지 않는다 — 복제하면 갱신 때 어긋난다.

## 문서

| 문서 | 역할 |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | **작업 문맥.** 연결 방법·디자인 원칙·진행 상태. 이어서 작업할 때 먼저 읽는다 |
| [`SCREENS.md`](./SCREENS.md) | 화면 목록·플로우·좌석/주문 상태 머신 |
| [`DESIGN-TOKENS.md`](./DESIGN-TOKENS.md) | 색·타이포·간격 토큰 (dark/light 2벌) |
| [`COMPONENTS.md`](./COMPONENTS.md) | 컴포넌트 장부 — 승격 큐·현황 |

## Figma 페이지 구조

```
00 · Cover
01 · Foundations      # 스타일 타일 + 컬러 보드 (다크·라이트 둘 다)
02 · Components       # 승격된 마스터. 카테고리 섹션(Actions/Forms/Navigation/Data display/Feedback)
03 · Screens          # 로그인·회원가입
04 · Screens          # 홈 → 상세 → 대기열 → 좌석선택 → 주문확인 → 결제결과 → 마이페이지
```

캔버스에 놓인 순서가 곧 플로우다. 프레임 이름에 `S2`·`P3` 같은 프리픽스는 쓰지 않는다.

## 디자인 원칙 (요약)

전체 규칙은 [`CLAUDE.md`](./CLAUDE.md) §2에 있다. 핵심만:

- **라이트 우선, 다크/라이트 2테마.** 무료 플랜이라 Figma 변수 모드 토글이 안 되므로
  Figma에는 보드를 각각 그리고, 실제 테마 전환은 코드(`../front/src/styles/tokens.css`의 `data-theme`)가 한다
- **데스크탑 우선(1440×1024)** 후 폭을 좁혀 모바일 대응. 목록 그리드·좌석맵은 모바일 프레임을 별도 재구성
- **오토레이아웃 최대한** — 고정 좌표 남발 금지
- 네이밍 `Group/variant` (예: `Button/primary`)
- 떠 있는 텍스트 라벨 금지 — 구분은 레이어 이름으로

## 컴포넌트 워크플로우

Claude가 `Group/variant` 프레임으로 그림 → [`COMPONENTS.md`](./COMPONENTS.md) 장부에 기록 →
**사용자가** Figma에서 승격(Create component ⌥⌘K + Combine as variants).

승격을 사람이 하는 이유는 도구 제약이다. TalkToFigma API로는 **컴포넌트 생성·변수(Variables) 생성이 불가**하고
프레임·텍스트·인스턴스만 만들 수 있다.

## 작업 환경 (TalkToFigma)

Figma 데스크탑 앱 + TalkToFigma 플러그인. 소켓 서버를 먼저 띄운다.

```
start-figma-socket.cmd        # bunx cursor-talk-to-figma-socket
```

- 채널 ID는 **세션마다 바뀐다** → 작업 시작 시 사용자에게 받아 `join_channel`
- 현재 Figma에서 **선택된 페이지가 작업 대상**이다. 시작 전 `get_document_info`로 확인
- 그 외 API 제약(알파 미지원, reparent 불가 등)은 [`CLAUDE.md`](./CLAUDE.md) §1

## 진행 상태

화면은 **로그인·회원가입 / 홈 / 상세 / 대기열 / 좌석선택 / 주문확인 / 결제결과 / 마이페이지 / 확인 모달**까지
그렸고 컴포넌트 승격도 2차까지 끝나 **핵심 작업은 일단락**됐다. 남은 것은 모바일 재구성·프로토타입 연결 등
선택 항목이다.

최신 상태는 항상 [`CLAUDE.md`](./CLAUDE.md) §7이 정본이다 — 여기에 중복해서 적지 않는다.

## 코드와의 연결

- 토큰: `DESIGN-TOKENS.md` ↔ [`../front/src/styles/tokens.css`](../front/src/styles/tokens.css) **1:1**
- 컴포넌트: 02 마스터 ↔ `../front/src/shared/ui/`
- 화면: 04 캔버스 ↔ `../front/src/pages/`
