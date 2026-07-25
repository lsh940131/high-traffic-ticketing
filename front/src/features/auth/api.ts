import { api } from '@/shared/api/client';
import type { AuthUser } from '@/features/auth/store';

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export const register = (body: { name: string; email: string; password: string }) =>
  api.post<AuthUser>('/auth/register', body).then((r) => r.data);

export const login = (body: { email: string; password: string }) =>
  api.post<AuthResponse>('/auth/login', body).then((r) => r.data);

// RT 쿠키로 새 AT 발급(+회전). 쿠키는 브라우저가 자동 첨부.
export const refresh = () => api.post<AuthResponse>('/auth/refresh').then((r) => r.data);

export const logout = () => api.post('/auth/logout').then((r) => r.data);

export const getMe = () =>
  api.get<{ userId: string; email: string }>('/auth/me').then((r) => r.data);
