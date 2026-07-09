/** 대기열 상태 응답. status에 따라 필드가 달라진다. */
export class QueueStatusDto {
  /** WAITING: 대기 중 · READY: 입장 가능 · EXPIRED: 대기열에서 빠짐(재입장 필요) */
  status!: 'WAITING' | 'READY' | 'EXPIRED';
  /** 내 앞의 대기 인원 (0이면 맨 앞) */
  rank!: number;
  /** 전체 대기 인원 */
  total!: number;
  /** 예상 대기 시간(초) */
  etaSeconds!: number;
  /** 입장 토큰 (status=READY일 때). 이후 좌석/예매 API에 x-entry-token으로 사용 */
  entryToken?: string;
  /** 입장 토큰 만료 시각 ISO (status=READY일 때). 카운트다운용 */
  expiresAt?: string;
}
