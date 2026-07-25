import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppHeader from '@/shared/ui/AppHeader';
import { useConcerts } from '@/features/concert/hooks';
import { formatDate, formatWon } from '@/shared/lib/format';

// S0: 홈 = 공연 목록. (1차 구현 — Figma 스크린샷으로 스타일 정밀 조정 예정)
export default function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useConcerts();

  return (
    <div>
      <AppHeader />
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 var(--space-6)' }}>{t('home.title')}</h1>
        {isLoading || !data ? (
          <p style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
        ) : data.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>{t('home.empty')}</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {data.map((c) => (
              <Link
                key={c.id}
                to={`/concerts/${c.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    aspectRatio: '3 / 4',
                    borderRadius: 'var(--radius-card)',
                    overflow: 'hidden',
                    background: 'var(--color-surface-2)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  {c.posterUrl && (
                    <img
                      src={c.posterUrl}
                      alt={c.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{c.name}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
                  {c.venueName} · {formatDate(c.startsAt)}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {c.soldOut ? (
                    <span style={{ color: 'var(--color-danger)' }}>{t('home.soldOut')}</span>
                  ) : c.minPrice != null ? (
                    t('home.priceFrom', { price: formatWon(c.minPrice) })
                  ) : (
                    t('home.priceTbd')
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
