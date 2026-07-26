import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBar, Button } from '@/shared/ui';
import { useConcert } from '@/features/concert/hooks';
import { useWaitingQueue } from '@/features/queue/hooks/useWaitingQueue';
import { enterQueue, leaveQueue } from '@/features/queue/api';
import { formatDate } from '@/shared/lib/format';
import './QueuePage.css';

// S2 · 대기열. 진입 시 enter → 폴링. READY면 입장 토큰 저장 + 지금 입장 CTA.
export default function QueuePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { data: concert } = useConcert(id);

  const [entered, setEntered] = useState(false);
  const [remain, setRemain] = useState(0); // READY 카운트다운(초)

  // 진입 시 1회 입장 등록 → 폴링 활성화
  useEffect(() => {
    let alive = true;
    enterQueue(id).finally(() => alive && setEntered(true));
    return () => {
      alive = false;
    };
  }, [id]);

  const { data } = useWaitingQueue(id, entered);

  // READY 남은 시간 로컬 카운트다운
  useEffect(() => {
    if (data?.status !== 'READY' || !data.expiresAt) return;
    const end = new Date(data.expiresAt).getTime();
    const tick = () => setRemain(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [data?.status, data?.expiresAt]);

  const leave = () => {
    leaveQueue(id).finally(() => nav(`/concerts/${id}`, { replace: true }));
  };
  const reenter = () => {
    setEntered(false);
    enterQueue(id).finally(() => setEntered(true));
  };

  const ctx = concert && (
    <div className="queue-ctx">
      <div className="queue-ctx__poster">
        {concert.posterUrl && <img src={concert.posterUrl} alt={concert.name} />}
      </div>
      <div>
        <div className="queue-ctx__title">{concert.name}</div>
        <div className="queue-ctx__meta">
          {formatDate(concert.startsAt)} · {concert.venueName}
        </div>
      </div>
    </div>
  );

  let body: ReactNode;
  if (!data) {
    body = <p className="queue-guide">{t('queue.entering')}</p>;
  } else if (data.status === 'READY') {
    const mmss = `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`;
    body = (
      <>
        <h1 className="queue-heading queue-heading--ready">{t('queue.readyHeading')}</h1>
        <div className="queue-num queue-num--time">{mmss}</div>
        <div className="queue-num-label">{t('queue.remainLabel')}</div>
        <div className="queue-divider" />
        <p className="queue-guide">{t('queue.guideReady')}</p>
        <div className="queue-warn">{t('queue.warnReady')}</div>
        <Button fullWidth onClick={() => nav(`/concerts/${id}/seats`)}>
          {t('queue.enterNow')}
        </Button>
      </>
    );
  } else if (data.status === 'EXPIRED') {
    body = (
      <>
        <h1 className="queue-heading">{t('queue.expiredHeading')}</h1>
        <p className="queue-guide">{t('queue.expiredGuide')}</p>
        <Button fullWidth onClick={reenter}>
          {t('queue.reenter')}
        </Button>
      </>
    );
  } else {
    // WAITING
    const pct =
      data.total > 0 ? Math.min(100, Math.round(((data.total - data.rank) / data.total) * 100)) : 0;
    const min = Math.max(1, Math.ceil(data.etaSeconds / 60));
    body = (
      <>
        <h1 className="queue-heading">{t('queue.waitingHeading')}</h1>
        <div className="queue-num">{data.rank.toLocaleString()}</div>
        <div className="queue-num-label">{t('queue.rankLabel')}</div>
        <div className="queue-bar">
          <div className="queue-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="queue-eta">{t('queue.eta', { min })}</div>
        <div className="queue-divider" />
        <p className="queue-guide">{t('queue.guideWaiting')}</p>
        <div className="queue-warn">{t('queue.warnWaiting')}</div>
        <Button variant="ghost" size="md" fullWidth onClick={leave}>
          {t('queue.leave')}
        </Button>
      </>
    );
  }

  return (
    <div>
      <AppBar />
      <div className="queue-stage">
        <div className="queue-card">
          {ctx}
          {body}
        </div>
      </div>
    </div>
  );
}
