import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  accessToken: string | null; // 메모리에만(persist X) — XSS 표면 최소화
  user: AuthUser | null;
  setAuth: (accessToken: string, user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
}));
