import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '@app/config';
import { PaymentFailCode, RETRYABLE_FAILS } from '@app/contracts';

export type ChargeResult =
  { ok: true; txId: string } | { ok: false; code: PaymentFailCode; retryable: boolean };

// 실패 시 대표 사유 가중 추첨(합 100). 실무 분포를 대충 흉내.
const FAIL_WEIGHTS: { code: PaymentFailCode; weight: number }[] = [
  { code: 'CARD_DECLINED', weight: 30 },
  { code: 'INSUFFICIENT_FUNDS', weight: 25 },
  { code: 'LIMIT_EXCEEDED', weight: 15 },
  { code: 'TIMEOUT', weight: 15 }, // 일시적(재시도 회복)
  { code: 'AUTH_ABANDONED_3DS', weight: 10 },
  { code: 'FRAUD_BLOCKED', weight: 5 },
];

/** PG 연동 mock. PAYMENT_FAIL_RATE 확률로 실패, 실패 시 대표 사유 반환. */
@Injectable()
export class PaymentService {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async charge(orderId: string, _amount: number): Promise<ChargeResult> {
    await new Promise((r) => setTimeout(r, 100)); // PG 지연 시뮬레이션
    const failRate = this.config.get('PAYMENT_FAIL_RATE', { infer: true });
    if (Math.random() >= failRate) {
      return { ok: true, txId: `tx_${orderId}_${Date.now().toString(36)}` };
    }
    const code = this.pickFail();
    return { ok: false, code, retryable: RETRYABLE_FAILS.includes(code) };
  }

  private pickFail(): PaymentFailCode {
    const total = FAIL_WEIGHTS.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const f of FAIL_WEIGHTS) {
      if ((r -= f.weight) < 0) return f.code;
    }
    return FAIL_WEIGHTS[0].code;
  }
}
