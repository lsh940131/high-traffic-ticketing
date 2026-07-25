import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/features/auth/hooks';
import LanguageToggle from '@/shared/ui/LanguageToggle';

export default function LoginPage() {
  const { t } = useTranslation();
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
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageToggle />
      </div>
      <h1>{t('auth.loginTitle')}</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.email')}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder={t('auth.password')}
        />
        <button type="submit" disabled={login.isPending}>
          {login.isPending ? t('auth.loggingIn') : t('auth.loginBtn')}
        </button>
      </form>
    </div>
  );
}
