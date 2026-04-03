import { useState, useCallback, useRef } from 'react';
import type { TaskMessage } from '../types';

interface SequencedItem {
  sequence: number;
}

/**
 * Manages cursor-based incremental message loading.
 * Tracks a lastSequence cursor and appends new messages on subsequent fetches.
 */
export function useIncrementalMessages<T extends SequencedItem = TaskMessage>(
  fetchFn: ((afterSequence: number) => Promise<T[]>) | null
) {
  const [messages, setMessages] = useState<T[]>([]);
  const lastSequenceRef = useRef(0);

  const fetchMessages = useCallback(
    async (afterSequence = 0) => {
      if (!fetchFn) return;
      try {
        const newMessages = await fetchFn(afterSequence);
        if (newMessages.length > 0) {
          if (afterSequence === 0) {
            setMessages(newMessages);
          } else {
            setMessages((prev) => [...prev, ...newMessages]);
          }
          lastSequenceRef.current = newMessages[newMessages.length - 1].sequence;
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    },
    [fetchFn]
  );

  const reset = useCallback(() => {
    lastSequenceRef.current = 0;
    setMessages([]);
  }, []);

  return { messages, setMessages, fetchMessages, lastSequenceRef, reset };
}
