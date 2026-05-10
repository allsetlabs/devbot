import { useCallback } from 'react';
import { chatHooks } from './useChat';
import type { InteractiveChat } from '../types';

export function useFavorites(allChats: InteractiveChat[]) {
  const starMutation = chatHooks.useStarChat();

  const isFavorite = useCallback(
    (chatId: string): boolean => allChats.find((c) => c.id === chatId)?.starred ?? false,
    [allChats]
  );

  const toggleFavorite = useCallback(
    (chatId: string) => {
      const chat = allChats.find((c) => c.id === chatId);
      starMutation.mutate({ id: chatId, starred: !(chat?.starred ?? false) });
    },
    [allChats, starMutation]
  );

  return { isFavorite, toggleFavorite };
}
