import { useQuery } from '@tanstack/react-query';
import { getQueueStatus } from '@/features/queue/api';

const POLL = Number(import.meta.env.VITE_QUEUE_POLL_INTERVAL_MS ?? 2500);

// 대기열 순번을 주기적으로 폴링. READY가 되면 입장 토큰을 세션에 저장.
export function useWaitingQueue(eventId: string) {
  return useQuery({
    queryKey: ['queue', eventId],
    queryFn: async () => {
      const s = await getQueueStatus(eventId);
      if (s.status === 'READY' && s.entryToken) {
        sessionStorage.setItem('entryToken', s.entryToken);
      }
      return s;
    },
    refetchInterval: (q) => (q.state.data?.status === 'READY' ? false : POLL),
  });
}
