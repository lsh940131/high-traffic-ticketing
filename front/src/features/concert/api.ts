import { api } from '@/shared/api/client';

export interface ConcertListItem {
  id: string;
  name: string;
  artist: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  opensAt: string;
  posterUrl: string | null;
  minPrice: number | null;
  remaining: number;
  soldOut: boolean;
}

export const getConcerts = () => api.get<ConcertListItem[]>('/concerts').then((r) => r.data);

export interface ConcertGrade {
  grade: string; // STANDING/R/S/A
  price: number;
  total: number;
  remaining: number;
}

export interface ConcertDetail {
  id: string;
  name: string;
  artist: string;
  venueName: string;
  venueLocation: string;
  startsAt: string;
  endsAt: string;
  opensAt: string;
  posterUrl: string | null;
  detailImages: string[];
  ageLimit: string | null;
  notice: string | null;
  grades: ConcertGrade[];
  remaining: number;
  soldOut: boolean;
}

export const getConcert = (id: string) =>
  api.get<ConcertDetail>(`/concerts/${id}`).then((r) => r.data);

// ── 좌석맵 (x-entry-token 필요 — 대기열 통과 후) ──
export interface SeatBlock {
  blockId: string; // "103" 또는 "STANDING"
  floor: string; // "1F".. "FLOOR"
  grade: string; // STANDING/R/S/A
  price: number;
  total: number;
  remaining: number;
  standing: boolean;
}

export interface SeatMap {
  concertId: string;
  venueName: string;
  blocks: SeatBlock[];
  grades: ConcertGrade[];
}

export interface SeatCell {
  ticketId: string;
  seatId: string;
  floor: string;
  section: string;
  row: string;
  seatNo: number;
  grade: string;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'SOLD';
}

export interface BlockSeats {
  concertId: string;
  blockId: string;
  grade: string;
  price: number;
  total: number;
  remaining: number;
  standing: boolean;
  seats: SeatCell[];
}

export const getSeatMap = (id: string) =>
  api.get<SeatMap>(`/concerts/${id}/seatmap`).then((r) => r.data);

export const getBlockSeats = (id: string, block: string) =>
  api.get<BlockSeats>(`/concerts/${id}/seats`, { params: { block } }).then((r) => r.data);
