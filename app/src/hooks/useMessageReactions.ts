import { useCallback, useMemo } from 'react';
import { useLocalStorageMap } from './useLocalStorageMap';

export type ReactionType = 'thumbsup' | 'thumbsdown';

type ChatReactions = Record<string, ReactionType | null>;

const STORAGE_KEY = 'devbot-message-reactions';

export function useMessageReactions(chatId: string) {
  const { data, set } = useLocalStorageMap<ChatReactions>(STORAGE_KEY);

  const chatReactions = useMemo(() => data[chatId] ?? {}, [data, chatId]);

  const getReaction = useCallback(
    (messageId: string): ReactionType | null => chatReactions[messageId] ?? null,
    [chatReactions]
  );

  const setReaction = useCallback(
    (messageId: string, type: ReactionType | null) => {
      const updated = { ...chatReactions };
      if (type === null) {
        delete updated[messageId];
      } else {
        updated[messageId] = type;
      }
      set(chatId, updated);
    },
    [chatId, chatReactions, set]
  );

  const toggleReaction = useCallback(
    (messageId: string, type: ReactionType) => {
      const current = chatReactions[messageId] ?? null;
      setReaction(messageId, current === type ? null : type);
    },
    [chatReactions, setReaction]
  );

  return { getReaction, setReaction, toggleReaction };
}
