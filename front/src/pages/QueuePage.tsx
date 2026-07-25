import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useWaitingQueue } from '@/features/queue/hooks/useWaitingQueue';
import { QueueProgress } from '@/features/queue/components/QueueProgress';

// S2: 대기열. READY가 되면 좌석 선택으로 이동.
export default function QueuePage() {
  const { eventId = '' } = useParams();
  const nav = useNavigate();
  const { data, isLoading } = useWaitingQueue(eventId);

  useEffect(() => {
    if (data?.status === 'READY') nav(`/events/${eventId}/seats`);
  }, [data?.status, eventId, nav]);

  if (isLoading || !data) return <p>대기열 진입 중…</p>;
  return <QueueProgress status={data} />;
}
