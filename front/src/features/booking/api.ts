import { api } from '@/shared/api/client';

// hold: 좌석(ticketIds) 또는 스탠딩 수량(standingQty) 중 하나. x-entry-token + AT 필요.
export interface HoldRequest {
  ticketIds?: string[];
  standingQty?: number;
}

export interface HoldResult {
  concertId: string;
  ticketIds: string[];
  seatIds: string[];
  amount: number;
  expiresAt: string; // 점유 만료(카운트다운 기준)
  holdSeconds: number;
}

export const holdSeats = (body: HoldRequest) =>
  api.post<HoldResult>('/reservations/hold', body).then((r) => r.data);

export const releaseHold = (ticketIds: string[]) =>
  api.post('/reservations/hold/release', { ticketIds }).then((r) => r.data);

// 예매 생성(주문). 선점한 ticketIds로 주문(PENDING) + Outbox. 결제는 비동기 → 결과 폴링.
export interface OrderResult {
  orderId: string;
  orderNo: string;
  amount: number;
  status: string; // PENDING
  ticketIds: string[];
}

export const reserve = (ticketIds: string[]) =>
  api.post<OrderResult>('/reservations', { ticketIds }).then((r) => r.data);
