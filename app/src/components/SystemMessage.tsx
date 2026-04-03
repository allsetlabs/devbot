import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import type { ClaudeMessageContent } from '../types';

/** Format token count to compact form (e.g., 1.2k, 15k, 1.1M) */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

/** Format duration from milliseconds to human-readable (e.g., 5s, 1m 30s, 2m) */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

/** Format cost to dollars (e.g., $0.05, $1.23) */
export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export interface UsageData {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  numTurns: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export function extractUsageData(content: ClaudeMessageContent): UsageData | null {
  if (content.type !== 'result') return null;

  const usage = content.usage as
    | {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      }
    | undefined;

  const costUsd = content.cost_usd as number | undefined;
  const durationMs = content.duration_ms as number | undefined;
  const numTurns = content.num_turns as number | undefined;

  if (!usage && costUsd === undefined && durationMs === undefined) return null;

  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    costUsd: costUsd ?? 0,
    durationMs: durationMs ?? 0,
    numTurns: numTurns ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage?.cache_creation_input_tokens ?? 0,
  };
}

export function UsageStats({ content }: { content: ClaudeMessageContent }) {
  const usage = extractUsageData(content);
  if (!usage) return null;

  const totalTokens = usage.inputTokens + usage.outputTokens;
  if (totalTokens === 0 && usage.costUsd === 0 && usage.durationMs === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground">
      {totalTokens > 0 && (
        <div className="flex items-center gap-1">
          <ArrowDownToLine className="h-3 w-3" />
          <span>{formatTokens(usage.inputTokens)}</span>
          <span className="text-muted-foreground/50">/</span>
          <ArrowUpFromLine className="h-3 w-3" />
          <span>{formatTokens(usage.outputTokens)}</span>
        </div>
      )}
      {usage.costUsd > 0 && (
        <div className="flex items-center gap-1">
          <Coins className="h-3 w-3" />
          <span>{formatCost(usage.costUsd)}</span>
        </div>
      )}
      {usage.durationMs > 0 && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{formatDuration(usage.durationMs)}</span>
        </div>
      )}
    </div>
  );
}

export function SystemMessage({
  content,
  onRetry,
  onRegenerate,
  showRetry,
}: {
  content: ClaudeMessageContent;
  onRetry?: () => void;
  onRegenerate?: () => void;
  showRetry?: boolean;
}) {
  const isCompletion = content.type === 'result' && content.subtype === 'success';
  const isError = content.type === 'result' && content.subtype === 'error';
  const isInterruption = content.type === 'system' && typeof content.message === 'string';

  if (isCompletion) {
    return (
      <div className="py-2">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm text-success">Task completed</span>
        </div>
        <UsageStats content={content} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-2">
        <div className="flex items-center justify-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">
            Task failed: {content.error || 'Unknown error'}
          </span>
        </div>
        <UsageStats content={content} />
        {showRetry && (onRetry || onRegenerate) && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                onClick={onRetry}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={onRegenerate}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isInterruption) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <span className="text-sm text-warning">{String(content.message)}</span>
      </div>
    );
  }

  return null;
}
