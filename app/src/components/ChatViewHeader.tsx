import { ArrowLeft, Eye, EyeOff, MessageCircle, Pencil, Pin, Search, Settings } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { MODE_CONFIG } from '../lib/mode-config';
import type { ChatMessage as ChatMessageType, InteractiveChat } from '../types';

const MAX_CONTEXT_TOKENS = 200000;

interface ChatViewHeaderProps {
  onBack: () => void;
  isRunning: boolean;
  chat: InteractiveChat | undefined;
  messages: ChatMessageType[];
  totalTokens?: number;
  onToggleSearch: () => void;
  hideToolResults: boolean;
  onToggleToolResults: () => void;
  pinnedIds: string[];
  onOpenPinnedMessages: () => void;
  onOpenSettings: () => void;
  onOpenRename: () => void;
}

export function ChatViewHeader({
  onBack,
  isRunning,
  chat,
  messages,
  totalTokens = 0,
  onToggleSearch,
  hideToolResults,
  onToggleToolResults,
  pinnedIds,
  onOpenPinnedMessages,
  onOpenSettings,
  onOpenRename,
}: ChatViewHeaderProps) {
  const toolResultCount = messages.filter((m) => {
    if (m.type === 'tool_use' || m.type === 'tool_result') return true;
    if (m.type === 'assistant' && Array.isArray(m.content?.message?.content)) {
      return m.content.message.content.every(
        (b: { type: string }) => b.type === 'tool_use' || b.type === 'tool_result'
      );
    }
    return false;
  }).length;

  return (
    <header className="relative flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <div className="h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full bg-primary" />
            ) : (
              <MessageCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {chat?.name || 'Chat'}
            </span>
            {chat?.permissionMode && chat.permissionMode !== 'dangerous' && (
              <span
                className={`inline-flex flex-shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${MODE_CONFIG[chat.permissionMode].bgColor} ${MODE_CONFIG[chat.permissionMode].color}`}
              >
                {MODE_CONFIG[chat.permissionMode].shortLabel}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={onOpenRename}
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleSearch}
          disabled={messages.length === 0}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7"
          onClick={onToggleToolResults}
          title={hideToolResults ? 'Show tool results' : 'Hide tool results'}
        >
          {hideToolResults ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
          {hideToolResults && toolResultCount > 0 && (
            <span className="text-warning-foreground absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[10px] font-semibold">
              {toolResultCount > 9 ? '9+' : toolResultCount}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7"
          onClick={onOpenPinnedMessages}
          disabled={pinnedIds.length === 0}
        >
          <Pin className="h-4 w-4 text-muted-foreground" />
          {pinnedIds.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {pinnedIds.length > 9 ? '9+' : pinnedIds.length}
            </span>
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenSettings}>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {totalTokens > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-primary/60 transition-all duration-300"
          style={{ width: `${Math.min((totalTokens / MAX_CONTEXT_TOKENS) * 100, 100)}%` }}
          title={`${Math.round(totalTokens / 1000)}k / ${MAX_CONTEXT_TOKENS / 1000}k tokens (${Math.round((totalTokens / MAX_CONTEXT_TOKENS) * 100)}%)`}
        />
      )}
    </header>
  );
}
