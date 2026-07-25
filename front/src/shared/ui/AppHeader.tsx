import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';
import LanguageToggle from '@/shared/ui/LanguageToggle';

export default function AppHeader() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const nav = useNavigate();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-6)',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
    >
      <Link
        to="/"
        style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}
      >
        {t('common.appName')}
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <LanguageToggle />
        <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>{t('common.mypage')}</span>
        {user && (
          <button
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => nav('/login', { replace: true }) })
            }
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-text-muted)',
              padding: '4px 8px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t('common.logout')}
          </button>
        )}
      </div>
    </header>
  );
}
