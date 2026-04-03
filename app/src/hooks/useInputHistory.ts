import { useRef, useCallback } from 'react';

/**
 * Shell-like input history navigation with Up/Down arrow keys.
 * Mirrors Claude Code CLI behavior where pressing Up cycles through
 * previously sent messages.
 */
export function useInputHistory() {
  const historyRef = useRef<string[]>([]);
  const indexRef = useRef(-1);
  // Stores the current input when user starts navigating history
  const draftRef = useRef('');

  /** Call after each message is sent to record it in history */
  const pushHistory = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Deduplicate consecutive entries
    if (historyRef.current[historyRef.current.length - 1] !== trimmed) {
      historyRef.current.push(trimmed);
    }
    // Reset navigation index
    indexRef.current = -1;
    draftRef.current = '';
  }, []);

  /**
   * Handle Up/Down arrow keys in the textarea.
   * Returns the new input value, or null if the key was not handled.
   *
   * @param key - 'ArrowUp' or 'ArrowDown'
   * @param currentInput - current textarea value
   * @param cursorPosition - current cursor position in the textarea
   */
  const handleHistoryKey = useCallback(
    (key: string, currentInput: string, cursorPosition: number): string | null => {
      const history = historyRef.current;
      if (history.length === 0) return null;

      if (key === 'ArrowUp') {
        // Only activate when cursor is at position 0 (start of input)
        if (cursorPosition !== 0) return null;

        if (indexRef.current === -1) {
          // Starting to navigate — save current input as draft
          draftRef.current = currentInput;
          indexRef.current = history.length - 1;
        } else if (indexRef.current > 0) {
          indexRef.current -= 1;
        } else {
          // Already at oldest entry
          return null;
        }
        return history[indexRef.current];
      }

      if (key === 'ArrowDown') {
        // Only handle if we're currently navigating history
        if (indexRef.current === -1) return null;

        if (indexRef.current < history.length - 1) {
          indexRef.current += 1;
          return history[indexRef.current];
        } else {
          // Past the newest entry — restore draft
          indexRef.current = -1;
          return draftRef.current;
        }
      }

      return null;
    },
    []
  );

  /** Reset navigation state (call when user types manually) */
  const resetNavigation = useCallback(() => {
    if (indexRef.current !== -1) {
      indexRef.current = -1;
      draftRef.current = '';
    }
  }, []);

  return { pushHistory, handleHistoryKey, resetNavigation };
}
