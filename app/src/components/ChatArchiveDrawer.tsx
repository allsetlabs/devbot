import { Archive } from 'lucide-react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@subbiah/reusable/components/ui/drawer';
import { Button } from '@subbiah/reusable/components/ui/button';
import DataFetchWrapper from '@subbiah/reusable/components/DataFetchWrapper';
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
          <Button
            variant="ghost"
            className="flex w-full items-center justify-between px-4 py-3"
          >
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
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Archived Chats</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-[20vh] overflow-y-auto">
          <DataFetchWrapper
            isLoading={isLoading}
            error={error}
            isEmpty={archivedChats.length === 0}
            emptyTitle="No Archived Chats"
            emptyMessage="Archived chats will appear here"
            emptyIcon={<Archive className="h-10 w-10 text-muted-foreground/50" />}
            loadingMessage="Loading archived chats..."
          >
            <div className="divide-y divide-border">
              {archivedChats.map((chat) => (
                <ArchivedChatItem
                  key={chat.id}
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
              ))}
            </div>
          </DataFetchWrapper>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
