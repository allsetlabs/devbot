import { useState, useEffect, useRef, useCallback } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';

/** Threshold in pixels from the bottom to consider "at bottom" */
const SCROLL_BOTTOM_THRESHOLD = 150;

interface UseMessageListScrollOptions {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  virtualizer: Virtualizer<any, any>;
  messageCount: number;
  autoScroll: boolean;
}

interface UseMessageListScrollReturn {
  isAtBottom: boolean;
  unreadCount: number;
  scrollLockUntilRef: React.MutableRefObject<number>;
  userScrolledRef: React.MutableRefObject<boolean>;
  scrollToBottom: () => void;
}

export function useMessageListScroll({
  scrollContainerRef,
  virtualizer,
  messageCount,
  autoScroll,
}: UseMessageListScrollOptions): UseMessageListScrollReturn {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessageCountRef = useRef(0);
  const scrollLockUntilRef = useRef(0);
  const userScrolledRef = useRef(false);

  const checkIsAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = checkIsAtBottom();
      setIsAtBottom(atBottom);
      if (atBottom && Date.now() > scrollLockUntilRef.current) {
        setUnreadCount(0);
        userScrolledRef.current = false;
      } else if (!atBottom) {
        userScrolledRef.current = true;
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [checkIsAtBottom, scrollContainerRef]);

  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newMessages = messageCount - prevCount;
    if (messageCount > 0 && newMessages > 0 && autoScroll) {
      if (!userScrolledRef.current && Date.now() > scrollLockUntilRef.current) {
        virtualizer.scrollToIndex(messageCount - 1, { align: 'end', behavior: 'smooth' });
      } else {
        setUnreadCount((prev) => prev + newMessages);
      }
    }
    prevMessageCountRef.current = messageCount;
  }, [messageCount, virtualizer, autoScroll]);

  useEffect(() => {
    if (
      messageCount > 0 &&
      prevMessageCountRef.current === 0 &&
      autoScroll &&
      Date.now() > scrollLockUntilRef.current
    ) {
      virtualizer.scrollToIndex(messageCount - 1, { align: 'end' });
      prevMessageCountRef.current = messageCount;
    }
  }, [messageCount, virtualizer, autoScroll]);

  const scrollToBottom = useCallback(() => {
    if (messageCount > 0) {
      virtualizer.scrollToIndex(messageCount - 1, { align: 'end', behavior: 'smooth' });
      setUnreadCount(0);
      userScrolledRef.current = false;
      setIsAtBottom(true);
    }
  }, [messageCount, virtualizer]);

  return { isAtBottom, unreadCount, scrollLockUntilRef, userScrolledRef, scrollToBottom };
}
