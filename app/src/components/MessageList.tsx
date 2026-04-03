import {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatMessage, formatDateSeparator } from './ChatMessage';
import { MessageActivityIndicator } from './MessageActivityIndicator';
import { ScrollToBottomFab } from './ScrollToBottomFab';
import { mergeConsecutiveAssistant, filterRenderable } from '../lib/message-list-utils';
import { useMessageListScroll } from '../lib/use-message-list-scroll';
import type { TaskMessage } from '../types';

interface MessageListProps {
  messages: TaskMessage[];
  isRunning?: boolean;
  onRetry?: () => void;
  onRegenerate?: () => void;
  onEdit?: (messageId: string, text: string) => void;
  autoScroll?: boolean;
  pinnedIds?: string[];
  onTogglePin?: (messageId: string) => void;
  searchQuery?: string;
  getMessageReaction?: (messageId: string) => string | null;
  onToggleMessageReaction?: (messageId: string, type: string) => void;
}

export const MessageList = forwardRef<
  { scrollToMessage: (index: number, align?: 'start' | 'center' | 'end') => void },
  MessageListProps
>(function MessageListImpl(
  {
    messages,
    isRunning = false,
    onRetry,
    onRegenerate,
    onEdit,
    autoScroll = true,
    pinnedIds = [],
    onTogglePin,
    searchQuery = '',
    getMessageReaction,
    onToggleMessageReaction,
  },
  ref
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(false);
  const virtualizerRef = useRef<ReturnType<typeof useVirtualizer> | null>(null);

  const renderedMessages = useMemo(
    () => filterRenderable(mergeConsecutiveAssistant(messages)),
    [messages]
  );

  const dateSeparatorMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < renderedMessages.length; i++) {
      const msg = renderedMessages[i];
      if (!msg.createdAt) continue;
      if (i === 0) {
        map.set(i, formatDateSeparator(msg.createdAt));
      } else {
        const prevMsg = renderedMessages[i - 1];
        if (!prevMsg.createdAt) continue;
        if (new Date(prevMsg.createdAt).toDateString() !== new Date(msg.createdAt).toDateString()) {
          map.set(i, formatDateSeparator(msg.createdAt));
        }
      }
    }
    return map;
  }, [renderedMessages]);

  const lastContentIndex = useMemo(() => {
    for (let i = renderedMessages.length - 1; i >= 0; i--) {
      if (renderedMessages[i].type === 'user' || renderedMessages[i].type === 'assistant') {
        return i;
      }
    }
    return -1;
  }, [renderedMessages]);

  const virtualizer = useVirtualizer({
    count: renderedMessages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 96,
    overscan: measured ? 5 : renderedMessages.length,
  });

  virtualizerRef.current = virtualizer;

  const { isAtBottom, unreadCount, scrollLockUntilRef, userScrolledRef, scrollToBottom } =
    useMessageListScroll({
      scrollContainerRef,
      virtualizer,
      messageCount: renderedMessages.length,
      autoScroll,
    });

  useImperativeHandle(
    ref,
    () => ({
      scrollToMessage: (messageIndex: number, align: 'start' | 'center' | 'end' = 'center') => {
        if (messageIndex >= 0 && messageIndex < renderedMessages.length) {
          scrollLockUntilRef.current = Date.now() + 5000;
          userScrolledRef.current = true;
          virtualizer.scrollToIndex(messageIndex, { align });
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(messageIndex, { align });
          });
        }
      },
    }),
    [virtualizer, renderedMessages.length, scrollLockUntilRef, userScrolledRef]
  );

  useEffect(() => {
    if (!measured && renderedMessages.length > 0) {
      requestAnimationFrame(() => {
        setMeasured(true);
        if (autoScroll) {
          virtualizer.scrollToIndex(renderedMessages.length - 1, { align: 'end' });
        }
      });
    }
  }, [measured, renderedMessages.length, virtualizer, autoScroll]);

  if (renderedMessages.length === 0) {
    return null;
  }

  return (
    <div
      ref={scrollContainerRef}
      className="relative flex-1 overflow-y-auto bg-background"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="relative w-full px-4" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const msg = renderedMessages[virtualItem.index];
          if (!msg) return null;
          const dateSeparator = dateSeparatorMap.get(virtualItem.index);
          return (
            <div
              key={msg.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              className="absolute left-0 w-full px-4 py-1.5"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              {dateSeparator && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="flex-shrink-0 text-[11px] font-medium text-muted-foreground">
                    {dateSeparator}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <ChatMessage
                message={msg}
                isLast={virtualItem.index === lastContentIndex}
                onRetry={virtualItem.index === renderedMessages.length - 1 ? onRetry : undefined}
                onRegenerate={
                  virtualItem.index === renderedMessages.length - 1 ? onRegenerate : undefined
                }
                onEdit={onEdit}
                isPinned={pinnedIds.includes(msg.id)}
                onTogglePin={onTogglePin}
                searchQuery={searchQuery}
                currentReaction={getMessageReaction ? (getMessageReaction(msg.id) as any) : null}
                onToggleReaction={
                  onToggleMessageReaction
                    ? (type) => onToggleMessageReaction(msg.id, type)
                    : undefined
                }
              />
            </div>
          );
        })}
        {isRunning && (
          <MessageActivityIndicator
            messages={messages}
            offsetY={virtualizer.getTotalSize()}
          />
        )}
      </div>

      {!isAtBottom && (
        <ScrollToBottomFab unreadCount={unreadCount} onClick={scrollToBottom} />
      )}
    </div>
  );
});
