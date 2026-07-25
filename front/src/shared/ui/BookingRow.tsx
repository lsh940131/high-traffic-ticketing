import type { ReactNode } from 'react';
import Badge, { type BadgeTone } from './Badge';
import './BookingRow.css';

interface BookingRowProps {
  posterUrl?: string | null;
  badge: { tone: BadgeTone; label: string };
  orderNo: string;
  title: string;
  meta: string; // 일시 · 장소
  seat: string; // 좌석·매수
  price: string; // 결제금액(포맷 완료)
  action?: ReactNode; // 우측 보조 액션(예: 예매취소 Button). 없으면 미표시.
  dimmed?: boolean; // 취소됨 상태 등 흐리게
}

/** 마이페이지 예매 내역 행. 상태(예매완료/관람완료/취소됨)는 badge+action+dimmed 조합으로 표현. */
export default function BookingRow({
  posterUrl,
  badge,
  orderNo,
  title,
  meta,
  seat,
  price,
  action,
  dimmed = false,
}: BookingRowProps) {
  return (
    <div className={['bookingrow', dimmed ? 'bookingrow--dimmed' : ''].filter(Boolean).join(' ')}>
      <div className="bookingrow__poster">{posterUrl && <img src={posterUrl} alt={title} />}</div>
      <div className="bookingrow__info">
        <div className="bookingrow__head">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <span className="bookingrow__order">{orderNo}</span>
        </div>
        <span className="bookingrow__title">{title}</span>
        <span className="bookingrow__meta">{meta}</span>
        <span className="bookingrow__seat">{seat}</span>
      </div>
      <div className="bookingrow__right">
        <span className="bookingrow__price">{price}</span>
        {action}
      </div>
    </div>
  );
}
