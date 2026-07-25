import './ZoneBlock.css';

export type ZoneState = 'default' | 'selected' | 'disabled';

interface ZoneBlockProps {
  label: string; // 블록 번호(예: "103")
  state?: ZoneState;
  onClick?: () => void;
}

/** 구역 블록. 구역맵에서 블록 클릭 → 좌석 그리드 전개. Figma 02 zoneblock/*. */
export default function ZoneBlock({ label, state = 'default', onClick }: ZoneBlockProps) {
  return (
    <button
      type="button"
      className={`zoneblock zoneblock--${state}`}
      disabled={state === 'disabled'}
      aria-pressed={state === 'selected'}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
