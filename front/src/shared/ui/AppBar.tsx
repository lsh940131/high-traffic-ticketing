import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';
import Button from './Button';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import './AppBar.css';

/** 상단 네비게이션. Figma 02 AppBar 기반 + 언어/테마 토글·로그아웃(기능 요건). */
export default function AppBar() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const nav = useNavigate();

  return (
    <header className="appbar">
      <Link to="/" className="appbar__logo">
        {t('common.appName')}
      </Link>
      <div className="appbar__right">
        <LanguageToggle />
        <ThemeToggle />
        <Link to="/mypage" className="appbar__link">
          {t('common.mypage')}
        </Link>
        {user && (
          <span className="appbar__avatar" aria-hidden>
            {(user.name.trim()[0] ?? 'U').toUpperCase()}
          </span>
        )}
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              logout.mutate(undefined, { onSettled: () => nav('/login', { replace: true }) })
            }
          >
            {t('common.logout')}
          </Button>
        )}
      </div>
    </header>
  );
}
