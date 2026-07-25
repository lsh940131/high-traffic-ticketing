import { Link } from 'react-router-dom';
import Badge, { type BadgeTone } from './Badge';
import './ConcertCard.css';

interface ConcertCardProps {
  to?: string;
  posterUrl?: string | null;
  title: string;
  meta: string; // "장소 · 일시" 등 이미 조합된 문자열
  badge?: { tone: BadgeTone; label: string };
  posterPlaceholder?: string;
}

/** 공연 카드. 목록·마이페이지 등에서 재사용. 배지 라벨은 i18n 문자열을 넘겨받는다. */
export default function ConcertCard({
  to,
  posterUrl,
  title,
  meta,
  badge,
  posterPlaceholder = '포스터',
}: ConcertCardProps) {
  const inner = (
    <>
      <div className="concert-card__poster">
        {posterUrl ? (
          <img src={posterUrl} alt={title} />
        ) : (
          <span className="concert-card__poster-ph">{posterPlaceholder}</span>
        )}
      </div>
      <div className="concert-card__info">
        {badge && (
          <span className="concert-card__badge">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>
        )}
        <span className="concert-card__title">{title}</span>
        <span className="concert-card__meta">{meta}</span>
      </div>
    </>
  );

  return to ? (
    <Link to={to} className="concert-card">
      {inner}
    </Link>
  ) : (
    <div className="concert-card">{inner}</div>
  );
}
