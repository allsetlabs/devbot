import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileStoresApi } from '../lib/api';

const keys = {
  all: ['file-stores'] as const,
  list: () => [...keys.all, 'list'] as const,
  store: (name: string) => [...keys.all, 'store', name] as const,
};

/** List all registered file stores. */
export function useFileStores() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => fileStoresApi.listStores(),
  });
}

/** Get a single store's info + records. */
export function useFileStore(name: string | null) {
  return useQuery({
    queryKey: keys.store(name ?? ''),
    queryFn: () => fileStoresApi.getStore(name!),
    enabled: !!name,
  });
}

/** Create a record in a store. */
export function useCreateRecord(storeName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fileStoresApi.createRecord(storeName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.store(storeName) });
      queryClient.invalidateQueries({ queryKey: keys.list() });
    },
  });
}

/** Update a record in a store. */
export function useUpdateRecord(storeName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fileStoresApi.updateRecord(storeName, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.store(storeName) });
    },
  });
}

/** Delete a record from a store. */
export function useDeleteRecord(storeName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fileStoresApi.deleteRecord(storeName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.store(storeName) });
      queryClient.invalidateQueries({ queryKey: keys.list() });
    },
  });
}
