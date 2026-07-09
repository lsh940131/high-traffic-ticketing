// 서비스 간 Kafka 이벤트 계약(스키마). 모든 서비스가 이 정의를 공유한다.
export const TOPICS = {
  ORDER_REQUESTED: 'order.requested', // 예매 요청됨(결제 대기) → payment consumer
  ORDER_CONFIRMED: 'order.confirmed', // 결제 승인·확정
  ORDER_FAILED: 'order.failed', // 결제 실패
} as const;

/** 예매 요청: 주문 1건(좌석 N). reservation → payment. */
export interface OrderRequested {
  orderId: string;
  userId: string;
  concertId: string;
  ticketIds: string[];
  seatIds: string[]; // Redis hold 해제용(seatId 키)
  amount: number; // 총액(원)
}

export interface OrderConfirmed {
  orderId: string;
  orderNo: string;
  paymentTxId: string;
}

export interface OrderFailed {
  orderId: string;
  reason: string;
}
