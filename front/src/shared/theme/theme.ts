import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'theme';

/** data-theme 속성 적용. system이면 속성을 제거해 OS 설정(@media)을 따르게 한다. */
function apply(mode: ThemeMode) {
  const el = document.documentElement;
  if (mode === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', mode);
}

function initial(): ThemeMode {
  const saved = (typeof localStorage !== 'undefined' &&
    localStorage.getItem(KEY)) as ThemeMode | null;
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /** system → light → dark → system 순환 (수동 토글) */
  cycle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initial(),
  setMode: (mode) => {
    localStorage.setItem(KEY, mode);
    apply(mode);
    set({ mode });
  },
  cycle: () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(get().mode) + 1) % order.length];
    get().setMode(next);
  },
}));

/** 앱 부팅 시 1회: 저장된 테마를 즉시 반영. */
export function initTheme() {
  apply(initial());
}
