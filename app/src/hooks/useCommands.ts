import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SlashCommand } from '../types';

export function useCommands() {
  return useQuery<SlashCommand[]>({
    queryKey: ['commands'],
    queryFn: () => api.listCommands(),
    staleTime: 5 * 60 * 1000,
  });
}
