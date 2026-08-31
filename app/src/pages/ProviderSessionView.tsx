import { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, GitBranch, FolderOpen } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { unifiedChatApi } from '../lib/api';
import { ErrorBanner } from '../components/ErrorBanner';
import { MessageList } from '../components/MessageList';
import { ProviderIcon, PROVIDER_META } from '../components/ProviderIcon';
import { extractErrorMessage } from '../lib/format';
import type { CLIProvider, ProviderMessage, TaskMessage } from '../types';

// ─── Helpers ───────────────────────────────────────────────────────

/** Convert a CLI provider message into the TaskMessage shape that MessageList expects */
function toTaskMessage(msg: ProviderMessage, index: number): TaskMessage {
  return {
    id: msg.uuid || `cli-msg-${index}`,
    runId: 'cli-session',
    sequence: index,
    type: msg.type, // 'user' | 'assistant' maps directly
    content: {
      type: msg.type === 'user' ? 'human' : 'assistant',
      message: {
        role: msg.type === 'user' ? 'human' : 'assistant',
        content: [{ type: 'text', text: msg.text }],
      },
    },
    createdAt: msg.timestamp,
  };
}

// ─── Component ─────────────────────────────────────────────────────

export function ProviderSessionView() {
  const { provider, sessionId } = useParams<{ provider: string; sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const validProvider = (provider as CLIProvider) ?? 'claude';
  const decodedSessionId = sessionId ? decodeURIComponent(sessionId) : '';
  const projectDir = searchParams.get('projectDir') ?? undefined;
  const meta = PROVIDER_META[validProvider];

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cli-session', validProvider, decodedSessionId, projectDir],
    queryFn: () =>
      unifiedChatApi.getProviderSession(validProvider, decodedSessionId, projectDir),
    enabled: !!decodedSessionId,
  });

  const messages = data?.messages ?? [];
  const cwd = data?.cwd ?? '';
  const gitBranch = data?.gitBranch ?? '';
  const errorMsg = extractErrorMessage(error);

  // Convert provider messages to TaskMessage format for MessageList
  const taskMessages = useMemo(
    () => messages.map(toTaskMessage),
    [messages]
  );

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/unified')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${meta.bgColor}`}>
          <ProviderIcon provider={validProvider} size={16} />
        </div>
        <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
        <h1 className="flex-1 truncate text-lg font-bold text-foreground">Session</h1>
      </header>

      {/* Context bar */}
      {(cwd || gitBranch) && (
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
          {cwd && (
            <span className="flex items-center gap-1 truncate">
              <FolderOpen className="h-3 w-3 shrink-0" />
              <span className="truncate">{cwd}</span>
            </span>
          )}
          {gitBranch && (
            <span className="flex shrink-0 items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {gitBranch}
            </span>
          )}
        </div>
      )}

      <ErrorBanner error={errorMsg} />

      {/* Message area */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading messages…
        </div>
      ) : taskMessages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No messages in this session.
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MessageList messages={taskMessages} autoScroll={false} />
        </div>
      )}
    </div>
  );
}
