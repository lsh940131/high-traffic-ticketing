import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppBar, Footer, Button, Checkbox } from '@/shared/ui';
import { useConcert } from '@/features/concert/hooks';
import { useBookingStore } from '@/features/booking/store';
import { reserve } from '@/features/booking/api';
import { formatDateTime, formatWon } from '@/shared/lib/format';
import './OrderPage.css';

// P4 · 주문 확인. 좌(예매정보·금액·약관) / 우(점유 타이머·결제하기). 수수료 없음.
export default function OrderPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const nav = useNavigate();
  const summary = useBookingStore((s) => s.summary);
  const clear = useBookingStore((s) => s.clear);
  const { data: concert } = useConcert(id);

  const [terms, setTerms] = useState({ t1: false, t2: false, t3: false });
  const [remain, setRemain] = useState(0);
  const [pending, setPending] = useState(false);

  const allAgreed = terms.t1 && terms.t2 && terms.t3;
  const setAll = (v: boolean) => setTerms({ t1: v, t2: v, t3: v });

  // 점유 카운트다운 (hold.expiresAt). 0이면 만료 → 좌석 선택으로 되돌림.
  useEffect(() => {
    if (!summary) return;
    const end = new Date(summary.hold.expiresAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemain(s);
      if (s === 0) {
        clear();
        alert(t('order.expired'));
        nav(`/concerts/${id}/seats`, { replace: true });
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [summary, clear, nav, id, t]);

  const mmss = useMemo(
    () =>
      `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`,
    [remain],
  );

  if (!summary) {
    return (
      <div>
        <AppBar />
        <main className="order-wrap">
          <p className="order-title">{t('order.title')}</p>
          <div className="order-card">
            <p>{t('order.empty')}</p>
            <Button onClick={() => nav(`/concerts/${id}`)}>{t('order.backToDetail')}</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { qty, amount, lines } = summary;
  const unit = qty > 0 ? Math.round(amount / qty) : amount;
  const seatText = `${lines.join(', ')} · ${qty}${t('order.unit')}`;

  const pay = async () => {
    setPending(true);
    try {
      const order = await reserve(summary.hold.ticketIds);
      clear();
      nav(`/orders/${order.orderId}`);
    } catch {
      setPending(false);
    }
  };

  return (
    <div>
      <AppBar />
      <main className="order-wrap">
        <h1 className="order-title">{t('order.title')}</h1>
        <div className="order-cols">
          {/* 좌 */}
          <section className="order-card">
            <h2 className="order-card__h">{t('order.hInfo')}</h2>
            <div className="order-summary">
              <div className="order-summary__poster">
                {concert?.posterUrl && <img src={concert.posterUrl} alt={summary.concertName} />}
              </div>
              <div>
                <div className="order-summary__title">{summary.concertName}</div>
                <div className="order-summary__meta">
                  {formatDateTime(summary.startsAt)} · {summary.venueName}
                </div>
                <div className="order-summary__seat">{seatText}</div>
              </div>
            </div>

            <h2 className="order-card__h order-card__h--mt">{t('order.hPrice')}</h2>
            <div className="order-prices">
              <div className="order-row">
                <span className="order-row__l">
                  {t('order.rowTicket', { unit: formatWon(unit), qty })}
                </span>
                <span className="order-row__v">{t('order.won', { n: formatWon(amount) })}</span>
              </div>
              <div className="order-row">
                <span className="order-row__l">{t('order.rowShip')}</span>
                <span className="order-row__v">{t('order.won', { n: 0 })}</span>
              </div>
              <div className="order-divider" />
              <div className="order-row order-row--total">
                <span className="order-row__l">{t('order.rowTotal')}</span>
                <span className="order-row__v">{t('order.won', { n: formatWon(amount) })}</span>
              </div>
            </div>

            <h2 className="order-card__h order-card__h--mt">{t('order.hTerms')}</h2>
            <div className="order-terms">
              <div className="order-terms__all">
                <Checkbox
                  checked={allAgreed}
                  onChange={(e) => setAll(e.target.checked)}
                  label={t('order.agreeAll')}
                />
              </div>
              <Checkbox
                checked={terms.t1}
                onChange={(e) => setTerms((s) => ({ ...s, t1: e.target.checked }))}
                label={t('order.term1')}
              />
              <Checkbox
                checked={terms.t2}
                onChange={(e) => setTerms((s) => ({ ...s, t2: e.target.checked }))}
                label={t('order.term2')}
              />
              <Checkbox
                checked={terms.t3}
                onChange={(e) => setTerms((s) => ({ ...s, t3: e.target.checked }))}
                label={t('order.term3')}
              />
            </div>
          </section>

          {/* 우 */}
          <aside className="pay-panel">
            <div className="pay-timer">
              <span>{t('order.holdTimer')}</span>
              <span className="pay-timer__t">{mmss}</span>
            </div>
            <div className="pay-sum">
              <div className="pay-sum__t">{summary.concertName}</div>
              <div className="pay-sum__s">{seatText}</div>
            </div>
            <div className="order-divider" />
            <div className="pay-total">
              <span className="pay-total__l">{t('order.finalTotal')}</span>
              <span className="pay-total__v">{t('order.won', { n: formatWon(amount) })}</span>
            </div>
            <Button fullWidth disabled={!allAgreed || pending} onClick={pay}>
              {t('order.pay')}
            </Button>
            <div className="pay-note">{t('order.note')}</div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
