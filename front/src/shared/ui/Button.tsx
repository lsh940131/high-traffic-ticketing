import type { ButtonHTMLAttributes } from 'react';
import './Button.css';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

/**
 * 공용 버튼. Figma 02의 버튼 6종(primary/disabled/ghost/danger/home/cancel)을
 * variant×size×disabled 파라미터 하나로 흡수한다.
 *  - lg(50): 폼 CTA(로그인·가입·결제)  - md(44): 액션(나가기·홈으로·취소)  - sm(34): 인라인(예매행)
 */
export default function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, fullWidth ? 'btn--full' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
