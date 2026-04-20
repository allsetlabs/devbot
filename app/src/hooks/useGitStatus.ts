import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { GitStatus } from '../types';

export function useGitStatus(workingDir: string | null | undefined) {
  return useQuery<GitStatus>({
    queryKey: ['git-status', workingDir],
    queryFn: () => api.getGitStatus(workingDir!),
    enabled: !!workingDir,
    refetchInterval: 30000,
    staleTime: 10000,
  });
}
