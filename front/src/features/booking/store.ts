import { create } from 'zustand';
import type { HoldResult } from './api';

// 좌석선택(P3) → 주문확인(P4)로 넘길 선점 정보. 새로고침 시 사라지면 P4에서 좌석선택으로 되돌린다.
export interface BookingSummary {
  concertId: string;
  concertName: string;
  venueName: string;
  startsAt: string;
  lines: string[]; // 좌석 표기들 또는 "스탠딩 N매"
  qty: number;
  amount: number; // 티켓 합계(수수료 제외)
  hold: HoldResult;
}

interface BookingState {
  summary: BookingSummary | null;
  setSummary: (s: BookingSummary) => void;
  clear: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  clear: () => set({ summary: null }),
}));
