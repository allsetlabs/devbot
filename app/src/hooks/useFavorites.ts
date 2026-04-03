import { useCallback } from 'react';
import { useLocalStorageMap } from './useLocalStorageMap';

const FAVORITES_KEY = 'devbot-chat-favorites';

/**
 * Hook to manage favorite chats using localStorage.
 */
export function useFavorites() {
  const { data: favorites, set, remove } = useLocalStorageMap<boolean>(FAVORITES_KEY);

  const toggleFavorite = useCallback(
    (chatId: string) => {
      if (favorites[chatId]) {
        remove(chatId);
      } else {
        set(chatId, true);
      }
    },
    [favorites, set, remove]
  );

  const isFavorite = useCallback(
    (chatId: string): boolean => favorites[chatId] ?? false,
    [favorites]
  );

  const clearFavorite = useCallback((chatId: string) => remove(chatId), [remove]);

  return { favorites, toggleFavorite, isFavorite, clearFavorite };
}
