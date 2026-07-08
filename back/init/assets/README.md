# init/assets — 공연 기초 이미지

초기화(init) 시드가 MinIO에 올릴 공연 이미지를 여기에 둔다.
파일명 규칙(플랫, 폴더 없음):

- `<assetKey>_poster.*`   — 포스터 (목록/카드용)
- `<assetKey>_detail*.*`  — 상세 안내 이미지(세로로 긴 이미지). 여러 장이면 `_detail1`, `_detail2` …

확장자는 gif/jpg/png/webp 무관(스크립트가 `_poster.*`, `_detail*`로 글롭).

## 흐름 (back/init)

1. 아래 파일명으로 이미지를 이 폴더에 둔다.
2. `npm run seed` → MinIO `posters` 버킷에 `<slug>/poster.<ext>`, `<slug>/detail-<n>.<ext>`로 업로드.
3. 시드가 각 공연의 `posterUrl`(단일) / `detailImages`(배열)를 그 URL로 세팅.
   - 예) `http://localhost:9000/posters/silicagel/poster.gif`

원본 이미지는 로컬 기초데이터라 git 미추적(.gitignore). 스크립트/README만 커밋.

## assetKey ↔ slug ↔ 공연 매핑

| assetKey (파일명 접두어) | slug (MinIO/URL) | 아티스트 | 공연장 |
|---|---|---|---|
| `실리카겔` | `silicagel` | 실리카겔 | 인스파이어 아레나 |
| `쏜애플` | `thornapple` | 쏜애플 | 인스파이어 아레나 |
| `너드커넥션` | `nerdconnection` | 너드커넥션 | 인스파이어 아레나 |
| `터치드` | `touched` | 터치드 | 인스파이어 아레나 |
| `레이니` | `rainey` | 레이니 | 인스파이어 아레나 |
| `김종국` | `kimjongkook` | 김종국 | KSPO DOME |
| `ft아일랜드` | `ftisland` | FT아일랜드 | KSPO DOME |
| `b1a4` | `b1a4` | B1A4 | KSPO DOME |
| `제이슨므라즈` | `jasonmraz` | 제이슨 므라즈 | KSPO DOME |
| `장경민` | `jangkyungmin` | 장경민 | KSPO DOME |
