import { useCallback, useMemo } from 'react';
import { useLocalStorageMap } from './useLocalStorageMap';

const PINNED_MESSAGES_KEY = 'devbot-pinned-messages';

export function usePinnedMessages(chatId: string | undefined) {
  const { data, set, remove } = useLocalStorageMap<string[]>(PINNED_MESSAGES_KEY);

  const pinnedIds = useMemo(() => (chatId ? (data[chatId] ?? []) : []), [data, chatId]);

  const togglePin = useCallback(
    (messageId: string) => {
      if (!chatId) return;
      const updated = pinnedIds.includes(messageId)
        ? pinnedIds.filter((id) => id !== messageId)
        : [...pinnedIds, messageId];
      set(chatId, updated);
    },
    [chatId, pinnedIds, set]
  );

  const isPinned = useCallback((messageId: string) => pinnedIds.includes(messageId), [pinnedIds]);

  const clearAllPins = useCallback(() => {
    if (!chatId) return;
    remove(chatId);
  }, [chatId, remove]);

  return { pinnedIds, isLoaded: true, togglePin, isPinned, clearAllPins };
}
