import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@/features/auth/hooks';

// 임시 로그인 화면(추후 Figma 디자인으로 대체).
export default function LoginPage() {
  const nav = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('hong@test.com');
  const [password, setPassword] = useState('password123');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => nav('/', { replace: true }) });
  };

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', display: 'grid', gap: 12 }}>
      <h1>로그인</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="비밀번호"
        />
        <button type="submit" disabled={login.isPending}>
          {login.isPending ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  );
}
