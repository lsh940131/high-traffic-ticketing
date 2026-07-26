import { useQuery } from '@tanstack/react-query';
import { getConcerts, getConcert, getSeatMap, getBlockSeats } from '@/features/concert/api';

export const useConcerts = () => useQuery({ queryKey: ['concerts'], queryFn: getConcerts });

export const useConcert = (id: string) =>
  useQuery({ queryKey: ['concert', id], queryFn: () => getConcert(id), enabled: !!id });

export const useSeatMap = (id: string) =>
  useQuery({ queryKey: ['seatmap', id], queryFn: () => getSeatMap(id), enabled: !!id });

// 블록 선택 시 on-demand. 좌석 상태(HELD 등) 신선도 위해 캐시 짧게.
export const useBlockSeats = (id: string, block: string | null) =>
  useQuery({
    queryKey: ['blockseats', id, block],
    queryFn: () => getBlockSeats(id, block as string),
    enabled: !!id && !!block,
    staleTime: 5000,
  });
