import { useRef } from 'react';
// eslint-disable-next-line react-hooks/incompatible-library
import { useVirtualizer } from '@tanstack/react-virtual';
import { Archive } from 'lucide-react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { ArchivedChatItem } from './ArchivedChatItem';
import type { InteractiveChat } from '../types';

interface ChatArchiveDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archivedChats: InteractiveChat[];
  isLoading: boolean;
  error: string | null;
  isFavorite: (id: string) => boolean;
  onSelect: (chat: InteractiveChat) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

interface ArchivedVirtualListProps {
  archivedChats: InteractiveChat[];
  isFavorite: (id: string) => boolean;
  onSelect: (chat: InteractiveChat) => void;
  onOpenChange: (open: boolean) => void;
  onToggleFavorite: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function ArchivedVirtualList({
  archivedChats,
  isFavorite,
  onSelect,
  onOpenChange,
  onToggleFavorite,
  onDuplicate,
  onUnarchive,
  onDelete,
}: ArchivedVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: archivedChats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const chat = archivedChats[virtualItem.index];
          return (
            <div
              key={chat.id}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              className={
                virtualItem.index < archivedChats.length - 1 ? 'border-b border-border' : ''
              }
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ArchivedChatItem
                chat={chat}
                isFavorited={isFavorite(chat.id)}
                onSelect={() => {
                  onOpenChange(false);
                  onSelect(chat);
                }}
                onToggleFavorite={() => onToggleFavorite(chat.id)}
                onDuplicate={() => onDuplicate(chat.id)}
                onUnarchive={() => onUnarchive(chat.id)}
                onDelete={() => onDelete(chat.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChatArchiveDrawer({
  open,
  onOpenChange,
  archivedChats,
  isLoading,
  error,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onUnarchive,
  onDelete,
}: ChatArchiveDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <div className="border-t border-border">
        <DrawerTrigger asChild>
          <Button variant="ghost" className="flex w-full items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Archived</span>
              {archivedChats.length > 0 && (
                <span className="text-xs text-muted-foreground">({archivedChats.length})</span>
              )}
            </div>
          </Button>
        </DrawerTrigger>
      </div>

      <DrawerContent className="flex max-h-[80vh] flex-col">
        <DrawerHeader className="flex-shrink-0">
          <DrawerTitle>Archived Chats</DrawerTitle>
        </DrawerHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Loading archived chats...
          </div>
        )}
        {error && <div className="px-4 py-3 text-sm text-destructive">{error}</div>}
        {!isLoading && !error && archivedChats.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <Archive className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">No Archived Chats</p>
              <p className="text-xs text-muted-foreground">Archived chats will appear here</p>
            </div>
          </div>
        )}
        {!isLoading && !error && archivedChats.length > 0 && open && (
          <ArchivedVirtualList
            archivedChats={archivedChats}
            isFavorite={isFavorite}
            onSelect={onSelect}
            onOpenChange={onOpenChange}
            onToggleFavorite={onToggleFavorite}
            onDuplicate={onDuplicate}
            onUnarchive={onUnarchive}
            onDelete={onDelete}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
