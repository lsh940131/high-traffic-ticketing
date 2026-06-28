import { useQuery } from '@tanstack/react-query';
import { getReservationResult } from '../api/queue';

// 비동기 예매 결과를 폴링. CONFIRMED/실패면 폴링 중단.
export function useReservationStatus(reservationId?: string) {
  return useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => getReservationResult(reservationId!),
    enabled: !!reservationId,
    refetchInterval: (q) =>
      q.state.data?.state === 'PROCESSING' ? 1500 : false,
  });
}
