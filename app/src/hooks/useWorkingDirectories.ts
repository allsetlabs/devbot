import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { WorkingDirectory } from '../types';

const keys = {
  all: ['working-directories'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useWorkingDirectories() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => api.listWorkingDirectories(),
  });
}

export function useCreateWorkingDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, label }: { path: string; label?: string }) =>
      api.createWorkingDirectory(path, label),
    onSuccess: (newDir) => {
      queryClient.setQueryData<WorkingDirectory[]>(keys.list(), (prev) =>
        prev ? [...prev, newDir] : [newDir]
      );
    },
  });
}

export function useDeleteWorkingDirectory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkingDirectory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: keys.list() });
      const prev = queryClient.getQueryData<WorkingDirectory[]>(keys.list());
      queryClient.setQueryData<WorkingDirectory[]>(keys.list(), (old) =>
        old?.filter((d) => d.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(keys.list(), context.prev);
    },
  });
}
