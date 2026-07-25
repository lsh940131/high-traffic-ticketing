import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './Tab.css';

interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

/** 필터 칩. Figma 02 Tab/active·idle를 active prop으로 흡수. */
export default function Tab({ active = false, className = '', children, ...rest }: TabProps) {
  return (
    <button
      type="button"
      className={['tab', active ? 'tab--active' : 'tab--idle', className].filter(Boolean).join(' ')}
      aria-pressed={active}
      {...rest}
    >
      {children}
    </button>
  );
}
