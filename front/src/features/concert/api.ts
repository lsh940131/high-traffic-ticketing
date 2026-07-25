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
