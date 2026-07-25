import './SeatTile.css';

export type SeatState = 'can' | 'selected' | 'disabled';

interface SeatTileProps {
  state: SeatState;
  label?: string; // 접근성용(예: "5열 12번")
  onClick?: () => void;
}

/** 좌석 1칸. can/selected/disabled 3상태. Figma 02 seat/*. HELD·SOLD는 disabled로 합쳐 표기. */
export default function SeatTile({ state, label, onClick }: SeatTileProps) {
  return (
    <button
      type="button"
      className={`seat seat--${state}`}
      disabled={state === 'disabled'}
      aria-label={label}
      aria-pressed={state === 'selected'}
      onClick={onClick}
    />
  );
}
