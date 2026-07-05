import { Injectable } from '@nestjs/common';

/** PG 연동 mock. 성공/실패와 지연만 시뮬레이션. */
@Injectable()
export class PaymentService {
  async charge(orderNo: string, _amount: number): Promise<{ ok: boolean; txId?: string }> {
    await new Promise((r) => setTimeout(r, 100));
    return Math.random() > 0.02 ? { ok: true, txId: `tx_${orderNo}` } : { ok: false };
  }
}
