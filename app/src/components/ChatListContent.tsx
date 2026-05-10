import { useRef, useMemo, useState, useEffect } from 'react';
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

type ChatRow =
  | { type: 'header'; label: string }
  | { type: 'chat'; chat: InteractiveChat };

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'] as const;

function getChatDateGroup(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const chatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (chatDay >= today) return 'Today';
  if (chatDay >= yesterday) return 'Yesterday';
  if (chatDay >= weekAgo) return 'This Week';
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
    return 'This Month';
  return 'Older';
}

function buildGroupedRows(chats: InteractiveChat[]): ChatRow[] {
  const grouped = new Map<string, InteractiveChat[]>();
  for (const chat of chats) {
    const group = getChatDateGroup(chat.updatedAt);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(chat);
  }

  const rows: ChatRow[] = [];
  for (const label of GROUP_ORDER) {
    const group = grouped.get(label);
    if (!group) continue;
    rows.push({ type: 'header', label });
    for (const chat of group) rows.push({ type: 'chat', chat });
  }
  return rows;
}

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

  const rows = useMemo(() => buildGroupedRows(filteredChats), [filteredChats]);

  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, [searchQuery, showFavorites, selectedType]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.type === 'header' ? 36 : 72),
    overscan: 5,
  });

  const headerPositions = useMemo(() => {
    const positions: { label: string; start: number }[] = [];
    let offset = 0;
    for (const row of rows) {
      if (row.type === 'header') positions.push({ label: row.label, start: offset });
      offset += row.type === 'header' ? 36 : 72;
    }
    return positions;
  }, [rows]);

  const [stickyLabel, setStickyLabel] = useState<string | null>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const handle = () => {
      const top = el.scrollTop;
      let label: string | null = null;
      for (const pos of headerPositions) {
        if (pos.start <= top) label = pos.label;
      }
      setStickyLabel(label);
    };
    el.addEventListener('scroll', handle, { passive: true });
    handle();
    return () => el.removeEventListener('scroll', handle);
  }, [headerPositions]);

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
    <div className="relative flex h-full flex-col">
      {stickyLabel && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-border/50 bg-background/95 px-4 py-2 backdrop-blur-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {stickyLabel}
          </span>
          <div className="h-px flex-1 bg-border/40" />
        </div>
      )}
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows[virtualItem.index];
          if (!row) return null;

          if (row.type === 'header') {
            return (
              <div
                key={`${virtualItem.index}-header-${row.label}`}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <div className="flex items-center gap-2 border-b border-border/50 bg-background px-4 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
              </div>
            );
          }

          const chat = row.chat;
          const rowIndex = virtualItem.index;
          const nextRow = rows[rowIndex + 1];
          const showBorder = nextRow?.type === 'chat';

          return (
            <div
              key={`${virtualItem.index}-${chat.id}`}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              className={showBorder ? 'border-b border-border' : ''}
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
    </div>
  );
}
