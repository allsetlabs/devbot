import { ArrowLeft, FileText, MessageCircle, Search, Settings } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { ChatSessionSummaryModal } from './ChatSessionSummaryModal';
import { MODE_CONFIG } from '../lib/mode-config';
import type { ChatMessage as ChatMessageType, InteractiveChat } from '../types';
import { ChatProgressBadge } from './ChatProgressBadge';

const MAX_CONTEXT_TOKENS = 200000;

interface ChatViewHeaderProps {
  onBack: () => void;
  isRunning: boolean;
  chat: InteractiveChat | undefined;
  messages: ChatMessageType[];
  totalTokens?: number;
  onToggleSearch: () => void;
  onOpenSettings: () => void;
  onOpenCostDrawer: () => void;
}

export function ChatViewHeader({
  onBack,
  isRunning,
  chat,
  messages,
  totalTokens = 0,
  onToggleSearch,
  onOpenSettings,
  onOpenCostDrawer,
}: ChatViewHeaderProps) {
  const tokenPercent = Math.round((totalTokens / MAX_CONTEXT_TOKENS) * 100);
  const showContextWarning = totalTokens > 0 && tokenPercent >= 80;
  const isContextCritical = tokenPercent >= 95;
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <>
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
              <ChatProgressBadge progress={chat?.progress ?? null} />
              {chat?.permissionMode && chat.permissionMode !== 'dangerous' && (
                <span
                  className={`inline-flex flex-shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${MODE_CONFIG[chat.permissionMode].bgColor} ${MODE_CONFIG[chat.permissionMode].color}`}
                >
                  {MODE_CONFIG[chat.permissionMode].shortLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Desktop actions */}
        <div className="hidden flex-shrink-0 items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleSearch}
            disabled={messages.length === 0}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
          {(chat?.progress || chat?.summary) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSummaryOpen(true)}
              title="View session summary"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenSettings}>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        {/* Mobile actions */}
        <div className="flex flex-shrink-0 items-center gap-1 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleSearch}
            disabled={messages.length === 0}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </Button>
          {(chat?.progress || chat?.summary) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSummaryOpen(true)}
              title="View session summary"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenSettings}>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        {totalTokens > 0 && (
          <div
            className="absolute bottom-0 left-0 h-0.5 cursor-pointer bg-primary/60 transition-all duration-300"
            style={{ width: `${Math.min((totalTokens / MAX_CONTEXT_TOKENS) * 100, 100)}%` }}
            title={`${Math.round(totalTokens / 1000)}k / ${MAX_CONTEXT_TOKENS / 1000}k tokens (${Math.round((totalTokens / MAX_CONTEXT_TOKENS) * 100)}%) — click for details`}
            onClick={onOpenCostDrawer}
          />
        )}
      </header>
      {showContextWarning && (
        <div
          className={`flex cursor-pointer items-center justify-center border-b py-1 text-xs font-medium transition-colors ${
            isContextCritical
              ? 'border-destructive/30 bg-destructive/20 text-destructive-foreground'
              : 'text-warning-foreground border-warning/30 bg-warning/20'
          }`}
          onClick={onOpenCostDrawer}
          title="Click to view session cost and token usage"
        >
          Context {tokenPercent}% full — consider /compact
        </div>
      )}
      <ChatSessionSummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        progress={chat?.progress ?? null}
        summary={chat?.summary ?? null}
        chatName={chat?.name}
      />
    </>
  );
}
