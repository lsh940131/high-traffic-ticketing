import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppBar, ConcertCard, Footer, type BadgeTone } from '@/shared/ui';
import { useConcerts } from '@/features/concert/hooks';
import type { ConcertListItem } from '@/features/concert/api';
import { formatDate } from '@/shared/lib/format';
import './HomePage.css';

// 상태 파생: 매진 > 오픈예정(opensAt 미래) > 예매중. (SCREENS.md 정렬·상태 규칙)
type Status = 'booking' | 'openSoon' | 'soldout';
function statusOf(c: ConcertListItem, now: number): Status {
  if (c.soldOut) return 'soldout';
  if (new Date(c.opensAt).getTime() > now) return 'openSoon';
  return 'booking';
}
const TONE: Record<Status, BadgeTone> = {
  booking: 'success',
  openSoon: 'warning',
  soldout: 'danger',
};
const LABEL_KEY: Record<Status, string> = {
  booking: 'home.statusBooking',
  openSoon: 'home.statusOpenSoon',
  soldout: 'home.soldOut',
};
const RANK: Record<Status, number> = { booking: 0, openSoon: 1, soldout: 2 };

// 04 · Home = 공연 목록. 상태 배지 + 제목 + 일시·장소. 정렬: 예매중→오픈예정→매진, 이름 asc.
export default function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useConcerts();

  const sorted = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    return [...data]
      .map((c) => ({ c, status: statusOf(c, now) }))
      .sort((a, b) => RANK[a.status] - RANK[b.status] || a.c.name.localeCompare(b.c.name, 'ko'));
  }, [data]);

  return (
    <div>
      <AppBar />
      <main className="home-content">
        <h1 className="home-title">{t('home.title')}</h1>
        {isLoading || !data ? (
          <p className="home-muted">{t('common.loading')}</p>
        ) : sorted.length === 0 ? (
          <p className="home-muted">{t('home.empty')}</p>
        ) : (
          <div className="home-grid">
            {sorted.map(({ c, status }) => (
              <ConcertCard
                key={c.id}
                to={`/concerts/${c.id}`}
                posterUrl={c.posterUrl}
                title={c.name}
                meta={`${formatDate(c.startsAt)} · ${c.venueName}`}
                badge={{ tone: TONE[status], label: t(LABEL_KEY[status]) }}
                posterPlaceholder={t('home.posterPlaceholder')}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
