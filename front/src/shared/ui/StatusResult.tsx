import type { ReactNode } from 'react';
import './StatusResult.css';

export type ResultVariant = 'processing' | 'confirmed' | 'failed' | 'expired';

const SYMBOL: Record<ResultVariant, string> = {
  processing: '···',
  confirmed: '✓',
  failed: '✕',
  expired: '00:00',
};

interface StatusResultProps {
  variant: ResultVariant;
  heading: string;
  sub?: string;
  orderNo?: string; // 주문번호 (processing/confirmed)
  mini?: string; // 주문 요약 한 줄 (confirmed)
  holdLabel?: string; // 좌석 점유 잔여 (failed)
  actions?: ReactNode; // 버튼 슬롯 (Button 인스턴스들)
}

/**
 * 결제 결과 상태 카드. S5+R 화면 하나에서 variant만 바꿔 4상태(처리중/완료/실패/만료) 표현.
 * 문구·버튼은 i18n/화면에서 주입. Figma 02 StatusResult/*.
 */
export default function StatusResult({
  variant,
  heading,
  sub,
  orderNo,
  mini,
  holdLabel,
  actions,
}: StatusResultProps) {
  return (
    <div className="statusresult">
      <div className={`statusresult__icon statusresult__icon--${variant}`} aria-hidden>
        {SYMBOL[variant]}
      </div>
      <h2 className="statusresult__heading">{heading}</h2>
      {sub && <p className="statusresult__sub">{sub}</p>}
      {mini && <p className="statusresult__mini">{mini}</p>}
      {orderNo && <p className="statusresult__order">{orderNo}</p>}
      {holdLabel && <div className="statusresult__hold">{holdLabel}</div>}
      {actions && <div className="statusresult__actions">{actions}</div>}
    </div>
  );
}
