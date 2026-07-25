import type { ReactNode } from 'react';
import './Badge.css';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'processing' | 'neutral';

/**
 * 상태 배지. 공연상태(예매중=success/오픈예정=warning/매진=danger),
 * 대기열(대기중=warning/처리중=processing), 주문상태 등에 tone만 바꿔 재사용.
 */
export default function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
