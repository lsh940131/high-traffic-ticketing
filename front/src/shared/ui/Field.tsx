import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import './Field.css';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * 라벨 + 입력 + 에러메시지. Figma 02의 Field / Field-Error를 error prop 하나로 흡수.
 * on-blur 검증 실패 시 error 문구를 넘기면 빨강 테두리 + 하단 메시지가 뜬다.
 */
export default function Field({ label, error, id, className = '', ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={['field', error ? 'field--error' : '', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input id={inputId} className="field__input" aria-invalid={!!error} {...rest} />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
