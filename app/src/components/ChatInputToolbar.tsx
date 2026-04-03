import { ChevronDown, Cpu, Sparkles, Rabbit, Eye, CheckCircle, Zap, Coins, Clock, Repeat } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { MODE_CONFIG } from '../lib/mode-config';
import { MODEL_CONFIG } from '../lib/model-config';
import { formatTokens, formatCost, formatDuration } from './ChatMessage';
import { estimateTokens } from '../lib/format';
import type { InteractiveChat } from '../types';

interface SessionStats {
  totalTokens: number;
  totalCost: number;
  totalDuration: number;
  turnCount: number;
}

interface ChatInputToolbarProps {
  chat: InteractiveChat | undefined;
  sessionStats: SessionStats;
  input: string;
  onOpenModeDrawer: () => void;
  onOpenModelDrawer: () => void;
  onOpenMaxTurns: (currentMaxTurns?: number | null) => void;
}

export function ChatInputToolbar({
  chat,
  sessionStats,
  input,
  onOpenModeDrawer,
  onOpenModelDrawer,
  onOpenMaxTurns,
}: ChatInputToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {/* Model selector */}
        {chat?.model && (
          <Button
            variant="outline"
            size="sm"
            className={`flex h-auto flex-shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors active:opacity-70 ${MODEL_CONFIG[chat.model].bgColor} ${MODEL_CONFIG[chat.model].color} ${MODEL_CONFIG[chat.model].borderColor}`}
            onClick={onOpenModelDrawer}
          >
            {chat.model === 'opus' && <Sparkles className="h-3 w-3" />}
            {chat.model === 'sonnet' && <Cpu className="h-3 w-3" />}
            {chat.model === 'haiku' && <Rabbit className="h-3 w-3" />}
            {MODEL_CONFIG[chat.model].shortLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
        {/* Mode selector */}
        {chat?.permissionMode && (
          <Button
            variant="outline"
            size="sm"
            className={`flex h-auto flex-shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors active:opacity-70 ${MODE_CONFIG[chat.permissionMode].bgColor} ${MODE_CONFIG[chat.permissionMode].color} ${MODE_CONFIG[chat.permissionMode].borderColor}`}
            onClick={onOpenModeDrawer}
          >
            {chat.permissionMode === 'plan' && <Eye className="h-3 w-3" />}
            {chat.permissionMode === 'auto-accept' && <CheckCircle className="h-3 w-3" />}
            {chat.permissionMode === 'dangerous' && <Zap className="h-3 w-3" />}
            {MODE_CONFIG[chat.permissionMode].shortLabel}
            <ChevronDown className="h-3 w-3" />
          </Button>
        )}
        {input.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {input.length >= 1000 ? `${(input.length / 1000).toFixed(1)}k` : input.length}c/
            {estimateTokens(input) >= 1000
              ? `${(estimateTokens(input) / 1000).toFixed(1)}k`
              : estimateTokens(input)}
            t
          </span>
        )}
      </div>
      {(sessionStats.totalTokens > 0 || sessionStats.turnCount > 0) && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {sessionStats.totalTokens > 0 && (
            <span className="flex items-center gap-0.5">
              {formatTokens(sessionStats.totalTokens)}
            </span>
          )}
          {sessionStats.turnCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className={`flex h-auto items-center gap-0.5 rounded px-1 py-0.5 text-[11px] transition-colors hover:bg-muted ${chat?.maxTurns && sessionStats.turnCount >= chat.maxTurns ? 'text-destructive' : ''}`}
              onClick={() => onOpenMaxTurns(chat?.maxTurns)}
            >
              <Repeat className="h-3 w-3" />
              <span>
                {sessionStats.turnCount}
                {chat?.maxTurns ? `/${chat.maxTurns}` : ''}
              </span>
            </Button>
          )}
          {sessionStats.totalCost > 0 && (
            <span className="flex items-center gap-0.5">
              <Coins className="h-3 w-3" />
              {formatCost(sessionStats.totalCost)}
            </span>
          )}
          {sessionStats.totalDuration > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDuration(sessionStats.totalDuration)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
