import './Avatar.css';

/** 원형 이니셜 아바타. name 첫 글자를 대문자로. Figma 02 avatar. */
export default function Avatar({ name = 'U' }: { name?: string }) {
  const initial = (name.trim()[0] ?? 'U').toUpperCase();
  return (
    <span className="avatar" aria-hidden>
      {initial}
    </span>
  );
}
