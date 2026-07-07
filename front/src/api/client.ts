import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 8000,
});

// 입장 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('entryToken');
  if (token) config.headers['x-entry-token'] = token;
  return config;
});

// 백엔드 공통 봉투 처리
//  - 성공 { success, data, meta } → response.data = 실제 data 로 언랩
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  // 에러 공통 처리:
  //  - 4xx: 백엔드가 준 사용자용 메시지를 그대로 alert
  //  - 5xx·네트워크: 내부 메시지 노출 X, generic 안내
  //  - 개별 호출에서 { skipErrorAlert: true } 로 자동 alert 끌 수 있음(예: 401 리다이렉트)
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message =
      body && body.success === false && body.error?.message ? body.error.message : undefined;
    if (message) error.message = message;

    const skip = (error.config as { skipErrorAlert?: boolean } | undefined)?.skipErrorAlert;
    if (!skip) {
      if (!error.response) {
        window.alert('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
      } else if (status >= 500) {
        window.alert('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else if (message) {
        window.alert(message);
      }
    }
    return Promise.reject(error);
  },
);
