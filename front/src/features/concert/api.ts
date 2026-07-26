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
