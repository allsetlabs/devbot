import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Company } from '../types';

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
  feedback: (id: string, type: string) => [...companyKeys.all, 'feedback', id, type] as const,
};

export function useGetCompanies() {
  return useQuery({
    queryKey: companyKeys.lists(),
    queryFn: () => api.listCompanies(),
    refetchInterval: 5000,
  });
}

export function useGetCompany(id: string | undefined) {
  return useQuery({
    queryKey: companyKeys.detail(id!),
    queryFn: () => api.getCompany(id!),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { name: string; idea: string }) => api.createCompany(params),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      queryClient.setQueriesData<Company[]>({ queryKey: companyKeys.lists() }, (prev) =>
        prev ? [company, ...prev] : [company]
      );
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCompany(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.lists() });
      const prev = queryClient.getQueriesData<Company[]>({ queryKey: companyKeys.lists() });
      queryClient.setQueriesData<Company[]>({ queryKey: companyKeys.lists() }, (old) =>
        old?.filter((c) => c.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      for (const [key, data] of context.prev) {
        queryClient.setQueryData(key, data);
      }
    },
  });
}

export function useGetFeedback(companyId: string | undefined, type: 'user' | 'investor') {
  return useQuery({
    queryKey: companyKeys.feedback(companyId!, type),
    queryFn: () => api.getCompanyFeedback(companyId!, type),
    enabled: !!companyId,
  });
}

export function useAddFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      companyId,
      type,
      prompt,
    }: {
      companyId: string;
      type: 'user' | 'investor';
      prompt: string;
    }) => api.addCompanyFeedback(companyId, type, prompt),
    onSuccess: (data, { companyId, type }) => {
      queryClient.setQueryData(companyKeys.feedback(companyId, type), data);
    },
  });
}

export const companyHooks = {
  useGetCompanies,
  useGetCompany,
  useCreateCompany,
  useDeleteCompany,
  useGetFeedback,
  useAddFeedback,
};
