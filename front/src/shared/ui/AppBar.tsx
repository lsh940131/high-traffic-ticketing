import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';
import SettingsModal from './SettingsModal';
import './AppBar.css';

/** 상단 네비게이션. 로고 + 마이페이지 링크 + 아바타(드롭다운: 설정·로그아웃). */
export default function AppBar() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const [open, setOpen] = useState(false); // 드롭다운
  const [settings, setSettings] = useState(false); // 설정 모달
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const initial = (user?.name.trim()[0] ?? 'U').toUpperCase();

  return (
    <header className="appbar">
      <div className="appbar__inner">
        <Link to="/" className="appbar__logo">
          {t('common.appName')}
        </Link>
        <div className="appbar__right">
          <Link to="/mypage" className="appbar__link">
            {t('common.mypage')}
          </Link>
          <div className="appbar__menu" ref={menuRef}>
            <button
              className="appbar__avatar"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {initial}
            </button>
            {open && (
              <div className="appbar__dropdown" role="menu">
                <button
                  className="appbar__item"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    setSettings(true);
                  }}
                >
                  {t('common.settings')}
                </button>
                <button
                  className="appbar__item appbar__item--danger"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    logout.mutate(undefined, { onSettled: () => nav('/login', { replace: true }) });
                  }}
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SettingsModal open={settings} onClose={() => setSettings(false)} />
    </header>
  );
}
