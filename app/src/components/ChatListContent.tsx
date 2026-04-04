import { MessageCircle, Search } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { ChatListItem } from './ChatListItem';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { copyToClipboard } from '../lib/clipboard';
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
}: ChatListContentProps) {
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
    <div>
      <div className="divide-y divide-border">
        {filteredChats.map((chat) => (
          <ChatListItem
            key={chat.id}
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
            hasCopyCommand={!!chat.claudeSessionId}
            onCopyCommand={
              chat.claudeSessionId
                ? (e) => {
                    e.stopPropagation();
                    copyToClipboard(
                      `cd /Users/subbiahchandramouli/Documents/GitHub/all_projects && claude --dangerously-skip-permissions --chrome --resume ${chat.claudeSessionId}`
                    );
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
