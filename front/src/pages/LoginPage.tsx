import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/features/auth/hooks';
import { Button, Field } from '@/shared/ui';
import './auth.css';

// 03 · Login. 가운데 360 폼(brand · heading · subtitle · 이메일/비번 · 로그인 · 회원가입 링크).
export default function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => nav('/', { replace: true }) });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-brand">
          {t('common.appName')}
        </Link>
        <h1 className="auth-heading">{t('auth.loginTitle')}</h1>
        <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>

        <form className="auth-form" onSubmit={submit}>
          <Field
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            className="auth-form__submit"
            type="submit"
            fullWidth
            disabled={login.isPending || !email || !password}
          >
            {login.isPending ? t('auth.loggingIn') : t('auth.loginBtn')}
          </Button>
        </form>

        <p className="auth-prompt">
          {t('auth.noAccount')}
          <Link to="/signup" className="auth-link">
            {t('auth.signupLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
