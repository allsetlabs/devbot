import { useState, useMemo, useCallback } from 'react';
import { extractTextContent, extractThinkingContent } from '../components/ChatMessage';
import type { TaskMessage } from '../types';

interface UseMessageSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  matchIndices: number[];
  currentMatchIdx: number;
  totalMatches: number;
  goToNext: () => void;
  goToPrev: () => void;
  /** The renderedMessages index to scroll to (or -1 if none) */
  activeMatchIndex: number;
}

/**
 * Search through chat messages by text content.
 * Returns matching message indices (into the renderedMessages array) and
 * navigation helpers to cycle through matches.
 */
export function useMessageSearch(messages: TaskMessage[]): UseMessageSearchReturn {
  const [query, setQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Find indices of messages whose text content matches the query
  const matchIndices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const indices: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      // Search user and assistant text content (including thinking blocks)
      if (msg.type === 'user' || msg.type === 'assistant') {
        const text = extractTextContent(msg.content).toLowerCase();
        const thinking = extractThinkingContent(msg.content).toLowerCase();
        if (text.includes(q) || thinking.includes(q)) {
          indices.push(i);
        }
      }
      // Search tool names
      if (msg.type === 'tool_use') {
        const toolName = (msg.content.tool_name as string) || '';
        if (toolName.toLowerCase().includes(q)) {
          indices.push(i);
        }
      }
    }
    return indices;
  }, [messages, query]);

  // Reset current match when query or matches change
  const setQueryAndReset = useCallback((q: string) => {
    setQuery(q);
    setCurrentMatchIdx(0);
  }, []);

  const totalMatches = matchIndices.length;

  const goToNext = useCallback(() => {
    if (totalMatches === 0) return;
    setCurrentMatchIdx((prev) => (prev + 1) % totalMatches);
  }, [totalMatches]);

  const goToPrev = useCallback(() => {
    if (totalMatches === 0) return;
    setCurrentMatchIdx((prev) => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  const activeMatchIndex = totalMatches > 0 ? matchIndices[currentMatchIdx] : -1;

  return {
    query,
    setQuery: setQueryAndReset,
    matchIndices,
    currentMatchIdx,
    totalMatches,
    goToNext,
    goToPrev,
    activeMatchIndex,
  };
}
