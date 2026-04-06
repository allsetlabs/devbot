import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { SlashCommand } from '../types';

export function useCommands(dir?: string | null) {
  return useQuery<SlashCommand[]>({
    queryKey: ['commands', dir ?? ''],
    queryFn: () => api.listCommands(dir ?? undefined),
    staleTime: 5 * 60 * 1000,
  });
}
