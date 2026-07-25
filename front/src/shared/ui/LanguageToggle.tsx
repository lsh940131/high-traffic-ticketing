import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isKo = i18n.language.startsWith('ko');
  return (
    <button
      onClick={() => i18n.changeLanguage(isKo ? 'en' : 'ko')}
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
      {isKo ? 'EN' : '한국어'}
    </button>
  );
}
