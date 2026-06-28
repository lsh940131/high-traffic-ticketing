// 서비스 간 Kafka 이벤트 계약(스키마). 모든 서비스가 이 정의를 공유한다.
export const TOPICS = {
  RESERVATION_REQUESTED: 'reservation.requested',
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  RESERVATION_FAILED: 'reservation.failed',
} as const;

export interface ReservationRequested {
  reservationId: string;
  eventId: string;
  seatId: string;
  userId: string;
}

export interface ReservationConfirmed {
  reservationId: string;
  orderNo: string;
  paymentTxId: string;
}

export interface ReservationFailed {
  reservationId: string;
  reason: string;
}
