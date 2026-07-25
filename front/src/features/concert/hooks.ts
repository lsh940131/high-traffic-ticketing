import { useQuery } from '@tanstack/react-query';
import { getConcerts } from '@/features/concert/api';

export const useConcerts = () => useQuery({ queryKey: ['concerts'], queryFn: getConcerts });
