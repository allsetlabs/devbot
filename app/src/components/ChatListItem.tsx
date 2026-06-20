import { useRef, useState } from 'react';
import {
  MessageCircle,
  Star,
  Pin,
  Archive,
  Trash2,
  Copy,
  FileText,
  Terminal,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@allsetlabs/forge/components/ui/dropdown-menu';
import { usePinnedMessages } from '../hooks/usePinnedMessages';
import { ChatProgressBadge } from './ChatProgressBadge';
import { ChatSessionSummaryModal } from './ChatSessionSummaryModal';
import { formatRelativeTime } from '../lib/format';
import { MODE_CONFIG } from '../lib/mode-config';
import { MODEL_CONFIG } from '../lib/model-config';
import type { InteractiveChat } from '../types';

const SWIPE_THRESHOLD = 80;
const MAX_SWIPE = 100;

interface ChatListItemProps {
  chat: InteractiveChat;
  isFavorited: boolean;
  onSelect: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onArchive: (e?: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  hasCopyCommand?: boolean;
  onCopyCommand?: () => void;
}

export function ChatListItem({
  chat,
  isFavorited,
  onSelect,
  onToggleFavorite,
  onDuplicate,
  onArchive,
  onDelete,
  hasCopyCommand = false,
  onCopyCommand,
}: ChatListItemProps) {
  const { pinnedIds } = usePinnedMessages(chat.id);
  const pinnedCount = pinnedIds.length;
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [swipeX, setSwipeX] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setIsSnapping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.touches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.touches[0].clientY);

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(dx) > 8) {
        isHorizontalSwipe.current = Math.abs(dx) > dy;
      } else {
        return;
      }
    }

    if (!isHorizontalSwipe.current) return;

    if (dx > 0) {
      e.preventDefault();
      setSwipeX(Math.min(dx, MAX_SWIPE));
    } else {
      setSwipeX(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isHorizontalSwipe.current) return;
    if (swipeX >= SWIPE_THRESHOLD) {
      setIsExiting(true);
      setTimeout(() => onArchive(), 220);
    } else {
      setIsSnapping(true);
      setSwipeX(0);
    }
    isHorizontalSwipe.current = null;
  };

  const showBackdrop = swipeX > 0 || isExiting;
  const pastThreshold = swipeX >= SWIPE_THRESHOLD || isExiting;
  const itemTransform = isExiting ? 'translateX(-100%)' : `translateX(-${swipeX}px)`;
  const itemTransition = isExiting || isSnapping ? 'transform 0.22s ease' : 'none';

  return (
    <div className="relative overflow-hidden">
      {showBackdrop && (
        <div
          className={`absolute inset-0 flex items-center justify-end gap-1 pr-6 transition-colors ${pastThreshold ? 'bg-primary' : 'bg-primary/70'}`}
          aria-hidden="true"
        >
          <Archive className="h-5 w-5 text-primary-foreground" />
          <span className="text-xs font-medium text-primary-foreground">Archive</span>
        </div>
      )}

      <a
        href={`/chat/${chat.id}`}
        className="relative flex items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted/50"
        style={{
          transform: itemTransform,
          transition: itemTransition,
        }}
        onClick={(e) => {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onSelect();
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div className="relative flex-shrink-0">
          {chat.isRunning ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          {isFavorited && (
            <Star className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-primary text-primary" />
          )}
          {pinnedCount > 0 && (
            <div className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Pin className="h-2.5 w-2.5 fill-background text-background" />
              {pinnedCount > 1 && (
                <span className="text-[8px] font-bold text-background">{pinnedCount}</span>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">{chat.name}</p>
            <ChatProgressBadge progress={chat.progress} />
            {chat.permissionMode && chat.permissionMode !== 'dangerous' && (
              <span
                className={`inline-flex flex-shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${MODE_CONFIG[chat.permissionMode].bgColor} ${MODE_CONFIG[chat.permissionMode].color}`}
              >
                {MODE_CONFIG[chat.permissionMode].shortLabel}
              </span>
            )}
            {chat.model && chat.model !== 'sonnet' && (
              <span
                className={`inline-flex flex-shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${MODEL_CONFIG[chat.model].bgColor} ${MODEL_CONFIG[chat.model].color}`}
              >
                {MODEL_CONFIG[chat.model].shortLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {chat.isRunning ? 'Running...' : formatRelativeTime(chat.updatedAt)}
          </p>
        </div>
        {/* Desktop: all actions inline */}
        <div className="hidden flex-shrink-0 items-center gap-1 lg:flex">
          {(chat.progress || chat.summary) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSummaryOpen(true);
              }}
              title="View session summary"
            >
              <FileText className="h-4 w-4 text-foreground/60" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted-foreground/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star
              className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : 'text-foreground/60'}`}
            />
          </Button>
          {hasCopyCommand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCopyCommand?.();
              }}
              title="Copy resume command"
            >
              <Terminal className="h-4 w-4 text-foreground/60" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted-foreground/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDuplicate(e);
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
              onArchive(e);
            }}
            title="Archive"
          >
            <Archive className="h-4 w-4 text-foreground/60" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(e);
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {/* Mobile/tablet: all actions in dropdown */}
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
              {(chat.progress || chat.summary) && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSummaryOpen(true);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  View summary
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Star className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
                {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              {hasCopyCommand && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyCommand?.();
                  }}
                >
                  <Terminal className="h-4 w-4" />
                  Copy resume command
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </a>
      <ChatSessionSummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        progress={chat.progress}
        summary={chat.summary}
        chatName={chat.name}
      />
    </div>
  );
}
