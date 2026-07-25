import { useParams } from 'react-router-dom';
import { useReservationStatus } from '@/features/booking/hooks/useReservationStatus';

// S5/S6: 비동기 예매 결과. Kafka 컨슈머가 처리 완료할 때까지 폴링.
export default function ReservationStatusPage() {
  const { reservationId } = useParams();
  const { data } = useReservationStatus(reservationId);

  if (!data || data.state === 'PROCESSING') return <p>예매를 처리하고 있습니다…</p>;
  if (data.state === 'CONFIRMED') return <h2>예매 완료! 주문번호 {data.orderNo}</h2>;
  if (data.state === 'SOLD_OUT') return <h2>아쉽지만 매진되었습니다.</h2>;
  return <h2>예매에 실패했습니다. {data.reason}</h2>;
}
