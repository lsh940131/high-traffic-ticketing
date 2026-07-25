import { create } from 'zustand';

interface SessionState {
  entryToken?: string;
  setEntryToken: (t: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  entryToken: sessionStorage.getItem('entryToken') ?? undefined,
  setEntryToken: (t) => {
    sessionStorage.setItem('entryToken', t);
    set({ entryToken: t });
  },
  clear: () => {
    sessionStorage.removeItem('entryToken');
    set({ entryToken: undefined });
  },
}));
