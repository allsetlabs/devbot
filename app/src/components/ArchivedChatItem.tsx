import { Archive, ArchiveRestore, Star, Copy, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@allsetlabs/reusable/components/ui/dropdown-menu';
import { formatRelativeTime } from '../lib/format';
import type { InteractiveChat } from '../types';

interface ArchivedChatItemProps {
  chat: InteractiveChat;
  isFavorited: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

export function ArchivedChatItem({
  chat,
  isFavorited,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onUnarchive,
  onDelete,
}: ArchivedChatItemProps) {
  return (
    <a
      href={`/chat/${chat.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted/50"
      onClick={(e) => {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
        <Archive className="h-5 w-5 text-muted-foreground" />
        {isFavorited && (
          <Star className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-primary text-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{chat.name}</p>
        <p className="text-xs text-muted-foreground">
          Archived {chat.archivedAt ? formatRelativeTime(chat.archivedAt) : ''}
        </p>
      </div>
      {/* Large screens: show icons directly */}
      <div className="hidden flex-shrink-0 items-center gap-1 lg:flex">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted-foreground/20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : 'text-foreground/60'}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted-foreground/20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
        >
          <Copy className="h-4 w-4 text-foreground/60" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted-foreground/20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onUnarchive();
          }}
          title="Unarchive"
        >
          <ArchiveRestore className="h-4 w-4 text-foreground/60" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive/20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {/* Small/medium screens: dropdown */}
      <div className="flex-shrink-0 lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggleFavorite}>
              <Star className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
              {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onUnarchive}>
              <ArchiveRestore className="h-4 w-4" />
              Unarchive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </a>
  );
}
