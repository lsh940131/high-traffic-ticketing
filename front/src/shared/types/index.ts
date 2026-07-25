export interface QueueStatus {
  status: 'WAITING' | 'READY';
  rank: number; // 내 앞 대기 인원
  total: number; // 전체 대기 인원
  etaSeconds: number; // 예상 대기 시간
  entryToken?: string; // status==READY일 때 발급
  tokenExpiresAt?: string;
}

export interface Seat {
  id: string;
  grade: string;
  price: number;
  state: 'AVAILABLE' | 'HELD' | 'SOLD';
}

export type ReservationState = 'PROCESSING' | 'CONFIRMED' | 'SOLD_OUT' | 'FAILED';

export interface ReservationResult {
  reservationId: string;
  state: ReservationState;
  orderNo?: string;
  reason?: string;
}
