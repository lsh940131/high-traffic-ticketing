import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRegister } from '@/features/auth/hooks';
import { Button, Field, Checkbox } from '@/shared/ui';
import './auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 03 · Signup. 이메일/비번/비번확인 + 필수약관. on-blur 검증, 모두 유효+동의 시 가입 활성.
export default function SignupPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const register = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  // 필드별 touched(블러됨) → 유효성 실패 시에만 에러 노출
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });

  const emailErr = !EMAIL_RE.test(email) ? t('auth.errEmail') : '';
  const passwordErr = password.length < 8 ? t('auth.errPasswordShort') : '';
  const confirmErr = confirm !== password ? t('auth.errPasswordMismatch') : '';
  const allValid = !emailErr && !passwordErr && !confirmErr && agree;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!allValid) {
      setTouched({ email: true, password: true, confirm: true });
      return;
    }
    // Figma엔 이름 필드가 없어 이메일 로컬파트를 표시명으로 사용.
    const name = email.split('@')[0];
    // 가입 완료 → 로그인 페이지로. (자동 로그인 X — 사용자가 직접 로그인)
    register.mutate(
      { name, email, password },
      { onSuccess: () => nav('/login', { replace: true }) },
    );
  };

  const pending = register.isPending;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="auth-brand">
          {t('common.appName')}
        </Link>
        <h1 className="auth-heading">{t('auth.signupTitle')}</h1>
        <p className="auth-subtitle">{t('auth.signupSubtitle')}</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <Field
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            error={touched.email ? emailErr : ''}
          />
          <Field
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.signupPasswordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            error={touched.password ? passwordErr : ''}
          />
          <Field
            label={t('auth.passwordConfirm')}
            type="password"
            autoComplete="new-password"
            placeholder={t('auth.passwordConfirmPlaceholder')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
            error={touched.confirm ? confirmErr : ''}
          />
          <div className="auth-terms">
            <Checkbox
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              label={t('auth.terms')}
            />
          </div>
          <Button
            className="auth-form__submit"
            type="submit"
            fullWidth
            disabled={pending || !allValid}
          >
            {pending ? t('auth.signingUp') : t('auth.signupBtn')}
          </Button>
        </form>

        <p className="auth-prompt">
          {t('auth.haveAccount')}
          <Link to="/login" className="auth-link">
            {t('auth.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
