/** 홈 공연 목록 아이템. 카드에 필요한 최소 정보 + 최저가/잔여. */
export class ConcertListItemDto {
  /** 공연 ID */
  id!: string;
  /** 공연명 */
  name!: string;
  /** 아티스트 */
  artist!: string;
  /** 공연장명 */
  venueName!: string;
  /** 공연 시작 일시 */
  startsAt!: Date;
  /** 공연 종료 일시(단일일이면 시작과 동일) */
  endsAt!: Date;
  /** 예매 오픈 일시 */
  opensAt!: Date;
  /** 포스터 이미지 URL */
  posterUrl!: string | null;
  /** 최저가(원). 티켓 없으면 null */
  minPrice!: number | null;
  /** 잔여 좌석 수(AVAILABLE 티켓 수) */
  remaining!: number;
  /** 매진 여부 */
  soldOut!: boolean;
}

/** 등급별 가격/잔여. */
export class ConcertGradeDto {
  /** 등급명 (STANDING/R/S/A) */
  grade!: string;
  /** 가격(원) */
  price!: number;
  /** 전체 좌석 수 */
  total!: number;
  /** 잔여 좌석 수(AVAILABLE) */
  remaining!: number;
}

/** 공연 상세. 목록 클릭 시 진입. 상세 이미지 + 등급별 가격/잔여 포함. */
export class ConcertDetailDto {
  /** 공연 ID */
  id!: string;
  /** 공연명 */
  name!: string;
  /** 아티스트 */
  artist!: string;
  /** 공연장명 */
  venueName!: string;
  /** 공연장 위치 */
  venueLocation!: string;
  /** 공연 시작 일시 */
  startsAt!: Date;
  /** 공연 종료 일시(단일일이면 시작과 동일) */
  endsAt!: Date;
  /** 예매 오픈 일시 */
  opensAt!: Date;
  /** 포스터 이미지 URL */
  posterUrl!: string | null;
  /** 상세 안내 이미지 URL들(세로 긴 이미지, 순서대로) */
  detailImages!: string[];
  /** 관람연령 */
  ageLimit!: string | null;
  /** 유의사항 */
  notice!: string | null;
  /** 등급별 가격/잔여 (STANDING→R→S→A 순) */
  grades!: ConcertGradeDto[];
  /** 총 잔여 좌석 수 */
  remaining!: number;
  /** 매진 여부 */
  soldOut!: boolean;
}

/** 좌석 하나. status는 DB(AVAILABLE/SOLD) + Redis(HELD) 병합 결과. */
export class SeatDto {
  /** 티켓 ID(공연×좌석, 예매 단위) */
  ticketId!: string;
  /** 물리 좌석 ID */
  seatId!: string;
  /** 층 (예: 1F, FLOOR) */
  floor!: string;
  /** 블록/구역 (예: 103, STANDING) */
  section!: string;
  /** 열 */
  row!: string;
  /** 번호 */
  seatNo!: number;
  /** 등급 (STANDING/R/S/A) */
  grade!: string;
  /** 가격(원) */
  price!: number;
  /** 좌석 상태 */
  status!: 'AVAILABLE' | 'HELD' | 'SOLD';
}

/** 블록(구역). 좌석맵의 블록 그리드용. standing=true면 좌석 그리드 없이 수량 선택. */
export class SeatBlockDto {
  /** 블록 ID (예: 103, STANDING) */
  blockId!: string;
  /** 층 (예: 1F, FLOOR) */
  floor!: string;
  /** 등급 (블록 단위 동일) */
  grade!: string;
  /** 가격(원) */
  price!: number;
  /** 블록 전체 좌석/수량 */
  total!: number;
  /** 블록 잔여(AVAILABLE) */
  remaining!: number;
  /** 스탠딩 여부(true면 좌석 그리드 없이 수량 선택) */
  standing!: boolean;
}

/** 좌석맵 요약(진입 시 1회). 블록 맵 + 등급 요약. 개별 좌석은 블록 조회로. */
export class SeatMapDto {
  /** 공연 ID */
  concertId!: string;
  /** 공연장명 */
  venueName!: string;
  /** 블록 목록 (FLOOR→1F→2F→3F, 블록번호 순) */
  blocks!: SeatBlockDto[];
  /** 등급별 가격/잔여 요약 (STANDING→R→S→A 순) */
  grades!: ConcertGradeDto[];
}

/** 블록 좌석(블록 클릭 시 on-demand). 그 블록 좌석 + 실시간 상태. */
export class BlockSeatsDto {
  /** 공연 ID */
  concertId!: string;
  /** 블록 ID (예: 103) */
  blockId!: string;
  /** 등급 */
  grade!: string;
  /** 가격(원) */
  price!: number;
  /** 블록 전체 좌석 수 */
  total!: number;
  /** 블록 잔여 좌석 수(AVAILABLE) */
  remaining!: number;
  /** 스탠딩 여부 */
  standing!: boolean;
  /** 좌석 목록 (열→번호 순) */
  seats!: SeatDto[];
}
