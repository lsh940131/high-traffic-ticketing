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
//  - 에러 { success:false, error:{ message } } → error.message 로 노출
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success === true && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    const body = error.response?.data;
    if (body && body.success === false && body.error?.message) {
      error.message = body.error.message;
    }
    return Promise.reject(error);
  },
);
