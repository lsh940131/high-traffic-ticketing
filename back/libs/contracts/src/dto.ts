// 서비스 간/클라이언트 공유 DTO 타입
export type ReservationState = 'PROCESSING' | 'CONFIRMED' | 'SOLD_OUT' | 'FAILED';

export interface CreateReservationDto {
  eventId: string;
  seatId: string;
  userId?: string;
}
