import type { InputHTMLAttributes, ReactNode } from 'react';
import './Checkbox.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

/** 체크박스. Figma 02 Checkbox/on·off를 checked 상태로 흡수. 약관 동의 등에 사용. */
export default function Checkbox({ label, className = '', ...rest }: CheckboxProps) {
  return (
    <label className={['checkbox', className].filter(Boolean).join(' ')}>
      <input type="checkbox" {...rest} />
      <span className="checkbox__box" aria-hidden>
        ✓
      </span>
      {label != null && <span className="checkbox__label">{label}</span>}
    </label>
  );
}
