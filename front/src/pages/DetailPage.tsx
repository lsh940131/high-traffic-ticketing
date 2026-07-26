import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DayPicker } from 'react-day-picker';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'react-day-picker/style.css';
import { AppBar, Footer, Button } from '@/shared/ui';
import { useConcert } from '@/features/concert/hooks';
import { buildSalesInfo } from '@/features/concert/salesInfo';
import { formatDate, formatWon } from '@/shared/lib/format';
import './DetailPage.css';

type TabKey = 'info' | 'sale';

// 04 · Detail. 좌(요약·탭) / 우(예매 패널). 회차 없음(단일 공연), 캘린더는 공연일만 선택 가능.
export default function DetailPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { data: c, isLoading } = useConcert(id);
  const [tab, setTab] = useState<TabKey>('info');

  const perfDate = useMemo(() => (c ? new Date(c.startsAt) : new Date()), [c]);

  if (isLoading || !c) {
    return (
      <div>
        <AppBar />
        <p className="detail-wrap">{t('common.loading')}</p>
      </div>
    );
  }

  const gradeLabel = (g: string) => (g === 'STANDING' ? t('detail.gradeStanding') : `${g}석`);
  const priceText = c.grades.map((g) => `${gradeLabel(g.grade)} ${formatWon(g.price)}`).join(' · ');
  const standingRemain = c.grades.find((g) => g.grade === 'STANDING')?.remaining ?? 0;
  const seatedRemain = c.grades
    .filter((g) => g.grade !== 'STANDING')
    .reduce((sum, g) => sum + g.remaining, 0);
  const periodText =
    c.startsAt === c.endsAt || formatDate(c.startsAt) === formatDate(c.endsAt)
      ? formatDate(c.startsAt)
      : `${formatDate(c.startsAt)} ~ ${formatDate(c.endsAt)}`;

  return (
    <div>
      <AppBar />
      <main className="detail-wrap">
        {/* 좌측 */}
        <div>
          <h1 className="detail-title">{c.name}</h1>
          <div className="detail-summary">
            <div className="detail-poster">
              {c.posterUrl ? (
                <img src={c.posterUrl} alt={c.name} />
              ) : (
                <span className="detail-poster-ph">{t('home.posterPlaceholder')}</span>
              )}
            </div>
            <div className="detail-spec">
              <div className="detail-spec__row">
                <b>{t('detail.venue')}</b>
                {c.venueName}
              </div>
              <div className="detail-spec__row">
                <b>{t('detail.period')}</b>
                {periodText}
              </div>
              {c.ageLimit && (
                <div className="detail-spec__row">
                  <b>{t('detail.age')}</b>
                  {c.ageLimit}
                </div>
              )}
              <div className="detail-spec__row">
                <b>{t('detail.price')}</b>
                {priceText}
              </div>
              {c.notice && (
                <div className="detail-spec__row">
                  <b>{t('detail.notice')}</b>
                  {c.notice}
                </div>
              )}
            </div>
          </div>

          {/* 탭 */}
          <div className="detail-tabs">
            <button
              className={`detail-tab ${tab === 'info' ? 'detail-tab--active' : ''}`}
              onClick={() => setTab('info')}
            >
              {t('detail.tabInfo')}
            </button>
            <button
              className={`detail-tab ${tab === 'sale' ? 'detail-tab--active' : ''}`}
              onClick={() => setTab('sale')}
            >
              {t('detail.tabSale')}
            </button>
          </div>

          <div className="detail-body">
            {tab === 'info' ? (
              c.detailImages.length > 0 ? (
                c.detailImages.map((src, i) => (
                  <img key={i} className="detail-info-img" src={src} alt={`${c.name} ${i + 1}`} />
                ))
              ) : (
                <div className="detail-info-empty">{t('detail.infoEmpty')}</div>
              )
            ) : (
              <div className="detail-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {buildSalesInfo({ venueName: c.venueName, ageLimit: c.ageLimit })}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* 우측 예매 패널 */}
        <aside className="booking-panel">
          <span className="booking-panel__label">{t('detail.watchDate')}</span>
          <DayPicker
            mode="single"
            selected={perfDate}
            defaultMonth={perfDate}
            disabled={(d: Date) => d.toDateString() !== perfDate.toDateString()}
            weekStartsOn={0}
          />
          <span className="booking-panel__remain">
            {t('detail.remainStanding')} {standingRemain} · {t('detail.remainSeated')}{' '}
            {seatedRemain}
            {t('detail.seatUnit')}
          </span>
          <Button fullWidth disabled={c.soldOut} onClick={() => nav(`/concerts/${c.id}/queue`)}>
            {c.soldOut ? t('detail.soldOut') : t('detail.book')}
          </Button>
        </aside>
      </main>
      <Footer />
    </div>
  );
}
