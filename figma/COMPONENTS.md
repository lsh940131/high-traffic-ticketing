# 컴포넌트 장부 (Component Ledger)

화면(03)을 그리면서 재사용 요소가 나올 때마다 여기에 기록한다. 02 · Components 캔버스에 무엇을, 어떤 variants로 넣을지의 단일 기준.

## 규칙
- 네이밍: `Group/variant` 슬래시 컨벤션 (예: `Button/primary`). 승격 시 자동으로 variant 그룹이 됨.
- 분류: **base**(공유 껍데기) · **atom**(최소 단위) · **molecule**(조합).
- 승격(promote): 사용자가 Figma에서 프레임 선택 → Create component(⌥⌘K) → 같은 Group이면 Combine as variants. (Claude는 컴포넌트 생성 불가 → 프레임만 그림)
- 상태(state)가 여러 개면 variant로, 한 번만 쓰면 컴포넌트화 안 함.

## 승격 큐 (02에 넣을 것)
> 화면 그리며 나온 것 중 02로 올릴 후보. 올린 건 [x]. (현황: 02에 마스터 15개 존재)

- [x] `Button` — primary / disabled (02에 Button/primary, Button/disabled 마스터 존재)
- [x] `Field` — default / error (Field, Field - Error 마스터 존재)
- [x] `Checkbox` — on / off
- [x] `AppBar` — 로고 + 마이페이지 + 아바타 (Home·상세 공통 인스턴스)
- [x] `Tab` — active / idle (필터 칩)
- [x] `ConcertCard` — 포스터 + StatusBadge + 제목 + 일시·장소
- [x] `Avatar`
- [x] `StatusBadge` — **승격은 됐으나 정리 필요**: 같은 이름 `StatusBadge/booking` 마스터가 3개(28:64/65/66)로 쪼개져 있음 → variants(booking/openSoon/soldout)로 **Combine** + 이름 정정 필요(사용자 작업).
- ~~`CalendarDayCell`~~ — **제외**: 상세 캘린더는 상세에서만 쓰므로 컴포넌트화 안 함(프레임 유지). ※ 옛 `DateChip`도 폐기(회차 칩의 오기였음).
- ~~`RoundChip`~~ — **제외**: 상세 BookingPanel 전용 1회성 → 프레임 유지.
- [x] `Footer` — 2컬럼(회사정보/고객센터) + 면책·저작권 (02 승격 완료, 04 Home에 인스턴스 반영)
- [ ] `QueueProgress` — 순번+진행바+예상시간 묶음 (S2 대기중 카드에 그림, 승격 대기)
- [ ] `ProgressBar` — track + fill (atom, S2 진행바)
- [ ] `Button/ghost` — 보조 액션(예: 대기 나가기). 현재 프레임으로 그림 → Button 그룹에 ghost variant로 합치기 후보
- ~~`Pagination`~~ — **폐기 완료**: 홈 5×2=10개로 불필요. 고아 마스터 삭제됨.

## 레지스트리

| 컴포넌트 | 종류 | variants / states | props(핵심) | 최초 등장 | 02 승격 |
|----------|------|-------------------|-------------|-----------|---------|
| `Button` | atom | primary / disabled (ghost/danger 추후) | label, size, loading | Foundations | ✅ |
| `StatusBadge` | atom | booking / openSoon / soldout (+추후 processing/failed) | label | Foundations | ⚠️ 마스터 3개 분리 → variants 합치기 |
| `QueueProgress` | molecule | default / ready | rank, total, etaSeconds | (S2) | 미작성 |
| `Field` | atom | default / error (focus 추후) | label, placeholder, errorMsg | S-Login | ✅ |
| `Checkbox` | atom | off / on | checked | S-Signup | ✅ |
| `AppBar` | base | default | logo, user | Home | ✅ |
| `Tab` | atom | active / idle | label, active | Home | ✅ |
| `ConcertCard` | molecule | 배지 색으로 상태 표현(booking/openSoon/soldout) | poster, title, date, venue, status | Home | ✅ |
| `Avatar` | atom | default | initials | Home | ✅ |
| `Footer` | base | default | — (정적 정보) | Home | ✅ |
| ~~`RoundChip`~~ | — | (상세 전용, 컴포넌트화 제외) | — | Detail | 제외 |
| ~~`CalendarDayCell`~~ | — | (상세 전용, 컴포넌트화 제외) | — | Detail | 제외 |

## 예정 후보 (화면 그리며 확정)
- base: `Modal/base`(오버레이+헤더+바디+풋터 슬롯), `Card/base`, `AppBar`, `CTABar`(모바일 하단 고정)
- atom: `Tag`
- molecule: `SeatTile`(available/held/sold/selected), `OrderRow`(주문 요약 행), `Toast`, `Countdown`(오픈/토큰 만료)

## 상태 컬러 규칙
- 대기중 → warning / 입장가능·성공 → success / 매진·실패 → danger / 처리중 → primary
- 폼 검증 에러 → danger(#E03131). 테두리 빨강(weight 1.5) + 입력칸 아래 12px 에러 메시지. 트리거: on-blur 유효성 실패(이메일 형식 / 비번 8자 미만 / 비번 확인 불일치).

## 컴포넌트 스펙 노트

### ConcertCard — 반응형 사이징
- 그리드는 `vertical > row(horizontal) > FILL 카드` 패턴. 카드 폭은 하드코딩하지 않고 FILL로 자동 분배.
- **데스크탑(1440)**: 5개/행 × 2행 = 10개(NOL 방식), gap 24 → 카드 FILL ≈ 240, 포스터 full-bleed = 카드폭 ≈ 240(NOL home 240×319.19과 동일).
- **모바일(375, 좌우패딩 16)**: 2개/행, gap 12 → 카드 FILL ≈ 165.
- (넓은 태블릿 ~768: 3개/행 허용)
- 포스터 **full-bleed**(카드 좌우·상단 패딩 0 → 포스터가 카드폭 꽉 채움, NOL 방식). 5/행 렌더 시 포스터 ≈240폭. 카드가 `clipsContent`라 포스터 상단 모서리는 카드 radius(12)로 자동 클립.
- 포스터 비율 **3:4 세로**(NOL 홈 240×319.19 기준). 높이 320(=240×4/3) 고정 + 너비 FILL. `object-fit: cover`. **목록(카드)·상세 동일 비율·동일 이미지**.
- 텍스트(info)에만 패딩: 좌우 16 / 상 14 / 하 16 (카드 패딩은 0).
- **02 마스터 기준 크기 = home 크기**(가장 많이 쓰는 곳). 카드 240×424, 포스터 240×320. home은 행 FILL이라 마스터 폭과 무관하게 자동 분배(≈240).
- **상세(P2) 포스터 = 300×400**(같은 3:4, 크기만 ↑). 상세에선 인스턴스/포스터를 300×400으로 리사이즈해 사용(목록=상세 동일 이미지·비율).

## 변경 로그
- (init) Foundations 타일 기준 Button / StatusBadge / QueueProgress 등록.
- 03 로그인/회원가입 그리며 `Field`, `Checkbox` 등록.
- 04 홈(콘서트 목록) 그리며 `AppBar`, `Tab`, `ConcertCard`, `Avatar` 등록. StatusBadge 카탈로그 상태(예매중/오픈예정/매진) 사용.
- 홈 하단에 `Pagination` 추가(사용자 "Page Numbers" 구조 참고, 색은 토큰). 그리드는 vertical>row>FILL 카드 패턴으로 재구성(데스크탑 4/행).
- 상세 페이지(P2, 04 페이지 Home 우측) 재구성(NOL 참고): 좌측 세로 포스터 + 정보 + **우측 예매 패널(달력+회차+예매하기)** + 하단 탭(공연정보|판매정보). AppBar·Button 인스턴스 재사용. 신규: `BookingPanel`/`Calendar`, `RoundChip`(회차). 포스터 **3:4 세로**(목록=상세 동일).
- 홈을 NOL 방식 **5/행 × 2행 = 10개**로 변경, **페이지네이션 제거**(`Pagination` 컴포넌트 후보 폐기). 콘서트 10번째(혁오, 예매중) 추가. 정렬: 예매중 6 → 오픈예정 2 → 매진 2.
- ConcertCard 포스터를 **full-bleed**로(카드 좌우·상단 패딩 0, info에만 패딩 16) → 포스터가 카드폭(≈240)을 꽉 채워 NOL과 동일. 높이 320으로 3:4 복원(240×320). 10개 일괄 반영. 02 마스터=240×424.
- 대기열(S2) 2상태 그림(04 페이지, Detail 아래): `대기중`(미니 컨텍스트+순번 12,480+진행바+예상시간+이탈경고+나가기 ghost), `입장가능`(체크 헤딩+카운트다운 02:58+지금 입장 Button/primary). AppBar·Button/primary 재사용. 신규 후보 QueueProgress/ProgressBar/Button-ghost. ※ 복제로 만든 입장가능 프레임 이름이 아직 "대기중"이라 사용자가 리네임 필요.
- 02 승격 현황 점검(get_local_components): 마스터 15개 확인. Button/Field/Checkbox/AppBar/Tab/ConcertCard/Avatar/StatusBadge ✅ 승격됨.
- `Footer` 02 승격 완료 → 04 Home에 인스턴스로 반영. 고아였던 `Pagination` 마스터 삭제 완료.
- 상세 캘린더(CalendarDayCell)·회차칩(RoundChip)은 상세 전용 1회성 → 컴포넌트화 제외(프레임 유지). 옛 `DateChip` 폐기.
- 남은 정리(사용자): StatusBadge 마스터 3개 분리 → variants(booking/openSoon/soldout)로 Combine + 이름 정정.
- 홈 하단 `Footer` 추가(NOL 방식): 2컬럼(회사정보/고객센터) + 면책·저작권. 흰 배경·상단 border, 내부 패딩 40, 전 페이지 공통 하단 후보. 회사·연락처는 모두 포트폴리오 데모 예시(TicketingLab). (정책 링크 줄·이용안내 컬럼은 링크처럼 보여 제외 — 정적 정보만.)
