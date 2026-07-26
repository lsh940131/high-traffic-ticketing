import { useQuery } from '@tanstack/react-query';
import { getConcerts, getConcert } from '@/features/concert/api';

export const useConcerts = () => useQuery({ queryKey: ['concerts'], queryFn: getConcerts });

export const useConcert = (id: string) =>
  useQuery({ queryKey: ['concert', id], queryFn: () => getConcert(id), enabled: !!id });
