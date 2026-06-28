import type { QueueStatus } from '../types';

// S2 대기열 핵심 컴포넌트: 순번/예상시간/진행바
export function QueueProgress({ status }: { status: QueueStatus }) {
  const done = status.total - status.rank;
  const pct = status.total > 0 ? Math.floor((done / status.total) * 100) : 0;
  return (
    <div className="queue-progress">
      <h2>{status.status === 'READY' ? '입장 가능합니다' : '대기 중'}</h2>
      <p>앞에 {status.rank.toLocaleString()}명 · 예상 {Math.ceil(status.etaSeconds / 60)}분</p>
      <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
