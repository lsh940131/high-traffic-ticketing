import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/store';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'; // Vite proxy → gateway(동일 오리진)

export const api = axios.create({ baseURL: BASE, timeout: 8000, withCredentials: true });

// 요청: 메모리 AT + 입장토큰 부착
api.interceptors.request.use((config) => {
  const at = useAuthStore.getState().accessToken;
  if (at) config.headers.Authorization = `Bearer ${at}`;
  const entry = sessionStorage.getItem('entryToken');
  if (entry) config.headers['x-entry-token'] = entry;
  return config;
});

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/logout'];
const isAuthPath = (url?: string) => !!url && AUTH_PATHS.some((p) => url.includes(p));

// 동시에 401 여러 개 떠도 refresh는 한 번만
let refreshing: Promise<string> | null = null;
function doRefresh(): Promise<string> {
  if (!refreshing) {
    refreshing = axios
      .post(`${BASE}/auth/refresh`, null, { withCredentials: true }) // bare axios(인터셉터 재귀 방지)
      .then((res) => {
        const d = (res.data?.data ?? res.data) as { accessToken: string; user: never };
        useAuthStore.getState().setAuth(d.accessToken, d.user);
        return d.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => {
    // 성공 봉투 { success, data, meta } → data 로 언랩
    const body = res.data;
    if (body && typeof body === 'object' && body.success === true && 'data' in body)
      res.data = body.data;
    return res;
  },
  async (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    const original = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    // 401 → refresh 1회 후 원요청 재시도. 실패면 로그아웃+로그인 이동.
    if (status === 401 && original && !original._retried && !isAuthPath(original.url)) {
      original._retried = true;
      try {
        const newAt = await doRefresh();
        if (original.headers) original.headers.Authorization = `Bearer ${newAt}`;
        return api(original);
      } catch {
        useAuthStore.getState().clear();
        if (window.location.pathname !== '/login') window.location.assign('/login');
        return Promise.reject(error);
      }
    }

    // 사용자용 에러 알림: 4xx=백엔드 메시지, 5xx·네트워크=generic (401 제외)
    const data = error.response?.data as
      { success?: boolean; error?: { message?: string } } | undefined;
    const message = data?.success === false && data.error?.message ? data.error.message : undefined;
    if (message) error.message = message;
    const skip = (error.config as { skipErrorAlert?: boolean } | undefined)?.skipErrorAlert;
    if (!skip && status !== 401) {
      if (!error.response) window.alert('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
      else if (status >= 500)
        window.alert('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      else if (message) window.alert(message);
    }
    return Promise.reject(error);
  },
);
