// 결제 실패 케이스 계약(백-프론트 공유). 대표 PG 실패 사유.
export type PaymentFailCode =
  | 'CARD_DECLINED' // 카드 거절
  | 'INSUFFICIENT_FUNDS' // 잔액 부족
  | 'LIMIT_EXCEEDED' // 한도 초과
  | 'AUTH_ABANDONED_3DS' // 3DS 본인인증 이탈
  | 'TIMEOUT' // 타임아웃/네트워크 (일시적)
  | 'FRAUD_BLOCKED'; // 이상거래 차단

// 일시적 실패 → 서비스단 재시도로 회복 가능. 나머지는 사용자 조치 필요(단말).
export const RETRYABLE_FAILS: PaymentFailCode[] = ['TIMEOUT'];

// 사용자에게 그대로 노출할 메시지(프론트 리액션 기준).
export const PAYMENT_FAIL_MESSAGES: Record<PaymentFailCode, string> = {
  CARD_DECLINED: '카드사에서 결제가 거절되었습니다. 다른 카드로 시도해주세요.',
  INSUFFICIENT_FUNDS: '잔액이 부족합니다. 다른 결제수단을 이용해주세요.',
  LIMIT_EXCEEDED: '카드 한도를 초과했습니다. 다른 카드로 시도해주세요.',
  AUTH_ABANDONED_3DS: '본인인증(3D Secure)이 완료되지 않았습니다. 다시 시도해주세요.',
  TIMEOUT: '결제 처리가 지연되었습니다. 잠시 후 다시 시도해주세요.',
  FRAUD_BLOCKED: '이상거래가 감지되어 결제가 차단되었습니다. 고객센터에 문의해주세요.',
};
