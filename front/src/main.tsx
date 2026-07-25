import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/shared/i18n';
import '@/styles/tokens.css';
import { initTheme } from '@/shared/theme/theme';

initTheme(); // 저장된 테마(system/light/dark)를 부팅 즉시 반영

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
