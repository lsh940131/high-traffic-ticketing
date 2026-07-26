import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { refresh } from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/store';
import ProtectedRoute from '@/features/auth/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import HomePage from '@/pages/HomePage';
import DetailPage from '@/pages/DetailPage';

const qc = new QueryClient();

// 부팅 시 RT 쿠키로 세션 복구(AT를 메모리에). 없으면 비로그인.
function useBootstrapAuth() {
  const [ready, setReady] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  useEffect(() => {
    refresh()
      .then((r) => setAuth(r.accessToken, r.user))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [setAuth]);
  return ready;
}

export default function App() {
  const ready = useBootstrapAuth();
  if (!ready) return <p style={{ padding: 32 }}>로딩 중…</p>;
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/concerts/:id" element={<DetailPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
