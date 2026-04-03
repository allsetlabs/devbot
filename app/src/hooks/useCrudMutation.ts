import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from '@tanstack/react-query';

export function useCrudMutation<TData = void, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  queryKeys: QueryKey[],
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error) => void;
  }
): UseMutationResult<TData, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      for (const key of queryKeys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      options?.onSuccess?.(data, variables);
    },
    onError: options?.onError,
  });
}
