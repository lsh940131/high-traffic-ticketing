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
