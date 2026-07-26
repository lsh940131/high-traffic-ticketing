import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore, type ThemeMode } from '@/shared/theme/theme';
import './SettingsModal.css';

const THEMES: ThemeMode[] = ['system', 'light', 'dark'];
const LANGS = ['ko', 'en'] as const;

/** 설정 모달 — 테마(system/light/dark) + 언어(ko/en). 아바타 드롭다운 '설정'에서 열림. */
export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const lang = i18n.language.startsWith('en') ? 'en' : 'ko';

  // Esc로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings__scrim" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings__head">
          <h2 className="settings__title">{t('settings.title')}</h2>
          <button className="settings__x" onClick={onClose} aria-label={t('settings.close')}>
            ✕
          </button>
        </div>

        <div className="settings__group">
          <span className="settings__label">{t('settings.theme')}</span>
          <div className="seg">
            {THEMES.map((m) => (
              <button
                key={m}
                className={`seg__btn ${mode === m ? 'seg__btn--active' : ''}`}
                onClick={() => setMode(m)}
              >
                {t(`settings.theme_${m}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="settings__group">
          <span className="settings__label">{t('settings.language')}</span>
          <div className="seg">
            {LANGS.map((l) => (
              <button
                key={l}
                className={`seg__btn ${lang === l ? 'seg__btn--active' : ''}`}
                onClick={() => i18n.changeLanguage(l)}
              >
                {t(`settings.lang_${l}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
