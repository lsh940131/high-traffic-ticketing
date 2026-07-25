import { useThemeStore, type ThemeMode } from '@/shared/theme/theme';

const ICON: Record<ThemeMode, string> = { system: '🖥', light: '☀', dark: '🌙' };
const LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

/** 테마 순환 토글(system→light→dark). 값만 바뀌고 컴포넌트는 그대로. */
export default function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const cycle = useThemeStore((s) => s.cycle);
  return (
    <button
      onClick={cycle}
      title={`Theme: ${LABEL[mode]}`}
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
      {ICON[mode]}
    </button>
  );
}
