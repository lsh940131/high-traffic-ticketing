# figma/CLAUDE.md — Figma 작업 문맥

이 파일은 **Figma 디자인 작업**을 이어받는 AI/사람이 먼저 읽는 문맥 파일이다. 사람·AI 누가 이어받아도 같은 규칙·상태로 일하도록 유지한다. 디자인 결정·진행이 바뀌면 이 파일을 갱신할 것. (프로젝트 전체 맥락은 루트가 아닌 `figma/` 기준으로 보되, 백엔드/인프라는 `../docs/ARCHITECTURE.md` 참고.)

## 0. 프로젝트 한 줄
High-Traffic Ticketing — 티켓 오픈 순간 트래픽 폭증을 견디는 티케팅 시스템(솔로 포트폴리오). Figma로 "딱 필요한 만큼"의 UI/UX를 기획하고, front(React)가 이를 보고 구현한다.

## 참고 문서 (figma/)
이 폴더의 다른 md를 단일 소스로 참고할 것. 값·스펙을 이 파일에 복제하지 않는다.
- `README.md` — figma 작업 개요
- `SCREENS.md` — 화면 목록·플로우·상태
- `DESIGN-TOKENS.md` — 색·타이포·간격·테마(토큰 단일 소스)
- `COMPONENTS.md` — 컴포넌트 장부(02 승격 큐)

## 1. 연결 방법 (TalkToFigma)
- Figma 데스크탑 + TalkToFigma 플러그인 실행 → 채널 join 후 작업.
- **현재 선택된 페이지가 작업 대상**이다. 작업 전 `get_document_info`로 현재 페이지 확인.
- **API 제약(중요)**: TalkToFigma로는 **컴포넌트 생성·변수(Variables) 생성 불가**. 프레임/텍스트/인스턴스만 가능. 컴포넌트 승격(⌥⌘K)·변수 모드 바인딩은 **사람이** 한다.
- `set_fill_color`는 알파(투명) 미지원 → 투명 대신 부모 배경색으로 칠해 묻힌다.
- 노드 재배치(reparent) 도구 없음 → 자식은 생성 시 `parentId`로 정확히 넣는다.

## 2. 디자인 원칙
- **라이트 우선** 디자인. 다크/라이트 2테마.
- 무료(Starter) 플랜 → **변수 모드 토글 불가.** 라이트는 코드(`../front/src/styles/tokens.css`, `data-theme`)에서 해결. Figma엔 다크/라이트 보드를 **각각** 그린다(필요한 화면만 복제+리컬러).
- **오토레이아웃 최대한 사용**(프레임/패딩/간격). 고정 좌표 남발 금지.
- **떠 있는 텍스트 라벨 금지** — 구분은 프레임 레이어 이름으로, 보여야 할 제목은 프레임의 자식으로(같이 움직이게).
- 네이밍: `Group/variant` 슬래시 컨벤션(예: `Button/primary`, `S2 / 대기열 / Mobile`).
- 반응형: **데스크탑 우선(1440폭)** 으로 그리고 width를 좁혀 모바일 대응. 폼류는 가운데 ~360 컬럼 고정(풀폭 stretch 금지). 단순 화면만 width 축소로 대응되고, 목록(그리드)·좌석맵 등은 모바일 프레임을 별도로 재구성. 데스크탑 표준 = 1440×1024(높이는 콘텐츠 가변).
- **그리드 = wrap 금지, vertical(행 묶음) > horizontal(row) > FILL 카드.** 카드를 FILL로 두면 폭이 자동 분배돼 빈 공간이 안 생긴다. 데스크탑 5/행(5×2=10, NOL 방식, 페이지네이션 없음), 모바일 2/행.

## 3. 디자인 토큰
색·타이포·간격·테마·상태 컬러의 **단일 소스는 `DESIGN-TOKENS.md`** (코드 `../front/src/styles/tokens.css`와 1:1). 여기엔 값을 복제하지 않는다 — 토큰이 필요하면 그 파일을 본다.

## 4. Figma 페이지 구조
`00 · Cover / 01 · Foundations / 02 · Components(빈 페이지, 사용자가 승격) / 03 · Screens / 04 · Flow`

## 5. 컴포넌트 워크플로우
- 장부: `COMPONENTS.md`. 화면 그리며 나온 재사용 요소를 기록(이름/variants/최초 등장/02 승격 여부).
- 흐름: 클로드가 `Group/variant` 프레임으로 그림 → 장부 기록 → 채팅으로 "02에 승격하세요" 안내 → **사용자가** 승격(Create component + Combine as variants).
- 02 캔버스는 사용자가 승격하기 전까지 빈 페이지로 둔다.
- 02 정리는 **카테고리별 섹션**(Actions / Forms / Navigation / Data display)으로. 출처 화면별 아님. 한 컴포넌트 = 한 자리 + variants 가로 나열. (Claude는 섹션 생성·이름변경 불가 → 클러스터 배치만, 섹션은 사용자.)

## 6. 화면 (SCREENS)
단일 소스 = `SCREENS.md`. 실제 진행: `03` = 로그인/회원가입(+에러), `04` = 홈(콘서트 목록). 이후 콘서트 상세 → 대기열 → 좌석선택 / 주문확인 → 결제처리중 → 결과 → 마이페이지. (참고: SCREENS.md엔 인증을 '범위 외'로 적었으나 03에 로그인/회원가입을 실제로 그림 — 흐름 완성용. 다음에 SCREENS.md 정합성 정리 필요.) 상태 핵심 화면 = 대기열, 결제 처리중. 좌석/주문 상태 머신·결제 실패 UX는 `SCREENS.md`.

## 7. 현재 진행 상태 (이어서 할 때 여기부터)
- [x] `01 · Foundations`: 스타일 타일 + 컬러 보드 **다크·라이트 둘 다** 완성.
- [x] `COMPONENTS.md` 장부 운영 중(승격 현황·제외 항목 반영). 현재 02 마스터 15개.
- [x] 화면 계획 확정: 인증 제외, 페이지 03/04 분할, 좌석/주문 상태 머신 정리(`SCREENS.md`).
- [x] `03`(페이지 "03 · Screens - Login & Signup"): 로그인·회원가입(데스크탑 1440, 가운데 360 폼) + 회원가입 에러 상태. `Field`/`Checkbox` 등록.
- [x] `04`(페이지 "04 · Screens - Home" = 홈): 콘서트 목록(데스크탑 **5×2=10개**, NOL 방식·페이지네이션 없음, vertical>row>FILL 그리드). 포스터 full-bleed 3:4(240×320). 02 마스터=home 크기(240×424). 하단 `Footer`(2컬럼+면책·저작권). `AppBar`/`Tab`/`ConcertCard`/`Avatar`/`Footer` 인스턴스.
- [x] **상세(P2, 04 페이지 `Detail` 31:289)**: 좌(포스터 300×400 + 정보 + 공연정보|판매정보 탭) / 우(BookingPanel: 캘린더+회차+예매하기, sticky). 캘린더·회차칩은 상세 전용(컴포넌트화 제외).
- [x] **02 승격 정리**: 마스터 15개 확인. Button/Field/Checkbox/AppBar/Tab/ConcertCard/Avatar/StatusBadge/Footer ✅. 고아 `Pagination` 마스터 삭제. 남은 정리=StatusBadge 3개 마스터 variants 합치기(사용자).
- [x] **대기열(S2)**: 2상태 그림(04 페이지, Detail 아래에 나란히). 대기중(순번·진행바·예상시간·이탈경고·나가기 ghost) / 입장가능(체크 헤딩·카운트다운·지금 입장 Button/primary). AppBar·Button/primary 재사용. 신규 후보=QueueProgress/ProgressBar/Button-ghost. ※ 입장가능 프레임 이름 리네임 필요(복제 흔적).
- [ ] **다음**: 좌석선택(P3) → 주문확인 → 결제처리중(S5) → 결과 → 마이페이지, 그리고 모바일 프레임(2열) 재구성.
- 방향: 데스크탑 우선·라이트 우선.
- 주의: TalkToFigma 채널 ID는 세션마다 바뀜 → 작업 시작 시 사용자에게 채널ID를 받아 `join_channel`.

## 8. 소통 메모
- 사용자 선호: 간결·직접적. 한국어. 떠 있는 라벨/과한 설명 싫어함.
