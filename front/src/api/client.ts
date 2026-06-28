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
