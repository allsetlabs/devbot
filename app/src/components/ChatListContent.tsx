import { useRef } from 'react';
// eslint-disable-next-line react-hooks/incompatible-library
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageCircle, Search } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ChatListItem } from './ChatListItem';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { copyToClipboard } from '../lib/clipboard';
import { toast } from 'sonner';
import { VITE_DEVBOT_PROJECTS_DIR } from '../lib/env';
import type { InteractiveChat } from '../types';

interface ChatListContentProps {
  chats: InteractiveChat[];
  filteredChats: InteractiveChat[];
  filteredArchivedChats: InteractiveChat[];
  isLoading: boolean;
  creating: boolean;
  searchQuery: string;
  showFavorites: boolean;
  selectedType: string | null;
  isFavorite: (id: string) => boolean;
  onSelect: (chat: InteractiveChat) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteArchived: (id: string) => void;
  onUnarchive: (id: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
  onResumeSession: (chat: InteractiveChat) => void;
}

export function ChatListContent({
  chats,
  filteredChats,
  isLoading,
  creating,
  searchQuery,
  showFavorites,
  selectedType,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onArchive,
  onDelete,
  onCreate,
  onClearFilters,
  onResumeSession,
}: ChatListContentProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: filteredChats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  if (isLoading && chats.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  if (chats.length === 0 && !searchQuery && !showFavorites && !selectedType) {
    return (
      <EmptyState
        icon={<MessageCircle className="h-16 w-16 text-muted-foreground/50" />}
        title="No chats yet"
        description="Start a new chat with Claude Code"
        actionLabel={creating ? 'Creating...' : 'Start First Chat'}
        onAction={onCreate}
        actionDisabled={creating}
      />
    );
  }

  if (filteredChats.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Search className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">No chats found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {showFavorites && !searchQuery
              ? 'No starred chats yet. Star a chat to find it here.'
              : searchQuery
                ? `No chats match "${searchQuery}"`
                : 'No chats match the current filter.'}
          </p>
        </div>
        {(showFavorites || searchQuery) && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const chat = filteredChats[virtualItem.index];
          return (
            <div
              key={chat.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              className={
                virtualItem.index < filteredChats.length - 1 ? 'border-b border-border' : ''
              }
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ChatListItem
                chat={chat}
                isFavorited={isFavorite(chat.id)}
                onSelect={() => onSelect(chat)}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(chat.id);
                }}
                onDuplicate={(e) => {
                  e.stopPropagation();
                  onDuplicate(chat.id);
                }}
                onArchive={(e) => {
                  e.stopPropagation();
                  onArchive(chat.id);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  onDelete(chat.id);
                }}
                hasResumeSession={!!chat.claudeSessionId && !chat.isRunning}
                onResumeSession={() => onResumeSession(chat)}
                hasCopyCommand={!!chat.claudeSessionId}
                onCopyCommand={
                  chat.claudeSessionId
                    ? () => {
                        copyToClipboard(
                          `cd ${VITE_DEVBOT_PROJECTS_DIR} && claude --dangerously-skip-permissions --chrome --resume ${chat.claudeSessionId}`
                        );
                        toast.success('Command copied!');
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
