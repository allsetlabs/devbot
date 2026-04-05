import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { InteractiveChat, PermissionMode, ClaudeModel } from '../types';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const chatKeys = {
  all: ['chats'] as const,
  lists: () => [...chatKeys.all, 'list'] as const,
  list: (filters: { type?: string | null; q?: string }) => [...chatKeys.lists(), filters] as const,
  archivedLists: () => [...chatKeys.all, 'archived'] as const,
  archivedList: (filters: { type?: string | null }) =>
    [...chatKeys.archivedLists(), filters] as const,
  types: () => [...chatKeys.all, 'types'] as const,
  details: () => [...chatKeys.all, 'detail'] as const,
  detail: (id: string) => [...chatKeys.details(), id] as const,
  status: (id: string) => [...chatKeys.all, 'status', id] as const,
};

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface CreateChatParams {
  name?: string;
  prompt?: string;
  systemPrompt?: string;
  model?: ClaudeModel;
  mode?: PermissionMode;
  type?: string;
  maxTurns?: number | null;
  workingDir?: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useGetChats(filters: { type?: string | null; q?: string } = {}) {
  return useQuery({
    queryKey: chatKeys.list(filters),
    queryFn: () => api.listInteractiveChats(filters.type ?? undefined),
    select: (chats: InteractiveChat[]) => {
      if (!filters.q) return chats;
      const q = filters.q.toLowerCase();
      return chats.filter((c) => c.name.toLowerCase().includes(q));
    },
    refetchInterval: (query) => {
      const chats = query.state.data as InteractiveChat[] | undefined;
      return chats?.some((c) => c.isRunning) ? 1000 : 5000;
    },
  });
}

export function useGetArchivedChats(filters: { type?: string | null; q?: string } = {}) {
  return useQuery({
    queryKey: chatKeys.archivedList({ type: filters.type }),
    queryFn: () => api.listArchivedChats(filters.type ?? undefined),
    select: (chats: InteractiveChat[]) => {
      if (!filters.q) return chats;
      const q = filters.q.toLowerCase();
      return chats.filter((c) => c.name.toLowerCase().includes(q));
    },
  });
}

export function useGetChatTypes() {
  return useQuery({
    queryKey: chatKeys.types(),
    queryFn: () => api.listChatTypes(),
  });
}

export function useGetChat(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.detail(id!),
    queryFn: () => api.getInteractiveChat(id!),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations — optimistic updates, rollback on error
// ---------------------------------------------------------------------------

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: CreateChatParams = {}) => {
      const chat = await api.createInteractiveChat({
        name: params.name,
        systemPrompt: params.systemPrompt,
        permissionMode: params.mode,
        model: params.model,
        maxTurns: params.maxTurns,
        workingDir: params.workingDir,
        ...(params.type ? { type: params.type } : {}),
      });
      // Fire-and-forget: send initial prompt if provided
      if (params.prompt) {
        api.sendChatMessage(chat.id, params.prompt).catch((err: unknown) => {
          console.error('[useCreateChat] Failed to send initial prompt:', err);
        });
      }
      return chat;
    },
    onSuccess: (chat) => {
      // Populate detail cache immediately
      queryClient.setQueryData(chatKeys.detail(chat.id), chat);
      // Prepend to all active list caches
      queryClient.setQueriesData<InteractiveChat[]>({ queryKey: chatKeys.lists() }, (prev) =>
        prev ? [chat, ...prev] : [chat]
      );
      // Invalidate types in case this is a new type
      void queryClient.invalidateQueries({ queryKey: chatKeys.types() });
    },
  });
}

export function useDuplicateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.duplicateInteractiveChat(id),
    onSuccess: (newChat) => {
      // Populate detail cache for the new chat
      queryClient.setQueryData(chatKeys.detail(newChat.id), newChat);
      // Prepend to all active list caches
      queryClient.setQueriesData<InteractiveChat[]>({ queryKey: chatKeys.lists() }, (prev) =>
        prev ? [newChat, ...prev] : [newChat]
      );
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInteractiveChat(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.lists() });
      await queryClient.cancelQueries({ queryKey: chatKeys.archivedLists() });
      const prevLists = queryClient.getQueriesData<InteractiveChat[]>({
        queryKey: chatKeys.lists(),
      });
      const prevArchived = queryClient.getQueriesData<InteractiveChat[]>({
        queryKey: chatKeys.archivedLists(),
      });
      queryClient.setQueriesData<InteractiveChat[]>({ queryKey: chatKeys.lists() }, (prev) =>
        prev?.filter((c) => c.id !== id)
      );
      queryClient.setQueriesData<InteractiveChat[]>(
        { queryKey: chatKeys.archivedLists() },
        (prev) => prev?.filter((c) => c.id !== id)
      );
      return { prevLists, prevArchived };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      for (const [key, data] of context.prevLists) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context.prevArchived) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: chatKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.types() });
    },
  });
}

export function useArchiveChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveInteractiveChat(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.lists() });
      const prevLists = queryClient.getQueriesData<InteractiveChat[]>({
        queryKey: chatKeys.lists(),
      });
      const now = new Date().toISOString();
      queryClient.setQueriesData<InteractiveChat[]>({ queryKey: chatKeys.lists() }, (prev) =>
        prev?.filter((c) => c.id !== id)
      );
      queryClient.setQueryData<InteractiveChat>(chatKeys.detail(id), (prev) =>
        prev ? { ...prev, archivedAt: now } : prev
      );
      return { prevLists };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      for (const [key, data] of context.prevLists) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(chatKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: chatKeys.archivedLists() });
    },
  });
}

export function useUnarchiveChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.unarchiveInteractiveChat(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.archivedLists() });
      const prevArchived = queryClient.getQueriesData<InteractiveChat[]>({
        queryKey: chatKeys.archivedLists(),
      });
      queryClient.setQueriesData<InteractiveChat[]>(
        { queryKey: chatKeys.archivedLists() },
        (prev) => prev?.filter((c) => c.id !== id)
      );
      queryClient.setQueryData<InteractiveChat>(chatKeys.detail(id), (prev) =>
        prev ? { ...prev, archivedAt: null } : prev
      );
      return { prevArchived };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      for (const [key, data] of context.prevArchived) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(chatKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: chatKeys.lists() });
    },
  });
}

export function useRenameChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameInteractiveChat(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.detail(id) });
      const prevDetail = queryClient.getQueryData<InteractiveChat>(chatKeys.detail(id));
      const prevLists = queryClient.getQueriesData<InteractiveChat[]>({
        queryKey: chatKeys.lists(),
      });
      queryClient.setQueryData<InteractiveChat>(chatKeys.detail(id), (prev) =>
        prev ? { ...prev, name } : prev
      );
      queryClient.setQueriesData<InteractiveChat[]>({ queryKey: chatKeys.lists() }, (prev) =>
        prev?.map((c) => (c.id === id ? { ...c, name } : c))
      );
      return { prevDetail, prevLists };
    },
    onError: (_err, { id }, context) => {
      if (!context) return;
      if (context.prevDetail) queryClient.setQueryData(chatKeys.detail(id), context.prevDetail);
      for (const [key, data] of context.prevLists) {
        queryClient.setQueryData(key, data);
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(chatKeys.detail(updated.id), updated);
      queryClient.setQueriesData<InteractiveChat[]>({ queryKey: chatKeys.lists() }, (prev) =>
        prev?.map((c) => (c.id === updated.id ? updated : c))
      );
    },
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: ({ chatId, prompt }: { chatId: string; prompt: string }) =>
      api.sendChatMessage(chatId, prompt),
  });
}

export function useStopChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => api.stopChat(chatId),
    onMutate: async (chatId) => {
      const prevDetail = queryClient.getQueryData<InteractiveChat>(chatKeys.detail(chatId));
      queryClient.setQueryData<InteractiveChat>(chatKeys.detail(chatId), (prev) =>
        prev ? { ...prev, isRunning: false } : prev
      );
      return { prevDetail };
    },
    onError: (_err, chatId, context) => {
      if (context?.prevDetail) {
        queryClient.setQueryData(chatKeys.detail(chatId), context.prevDetail);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Namespace export
// ---------------------------------------------------------------------------

export const chatHooks = {
  useGetChats,
  useGetArchivedChats,
  useGetChatTypes,
  useGetChat,
  useCreateChat,
  useDuplicateChat,
  useDeleteChat,
  useArchiveChat,
  useUnarchiveChat,
  useRenameChat,
  useSendMessage,
  useStopChat,
};
