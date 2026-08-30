import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, Bot, GitBranch, FolderOpen } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { unifiedChatApi } from '../lib/api';
import { ErrorBanner } from '../components/ErrorBanner';
import { extractErrorMessage } from '../lib/format';
import type { CLIProvider } from '../types';

const PROVIDER_NAMES: Record<CLIProvider, string> = {
  claude: 'Claude Code',
  codex: 'OpenAI Codex',
  kimi: 'Kimi Code',
  cursor: 'Cursor',
};

const PROVIDER_COLORS: Record<CLIProvider, string> = {
  claude: 'text-orange-500',
  codex: 'text-green-500',
  kimi: 'text-blue-500',
  cursor: 'text-purple-500',
};

const ASSISTANT_LABELS: Record<CLIProvider, string> = {
  claude: 'Claude',
  codex: 'Codex',
  kimi: 'Kimi',
  cursor: 'Cursor',
};

export function ProviderSessionView() {
  const { provider, sessionId } = useParams<{ provider: string; sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const validProvider = (provider as CLIProvider) ?? 'claude';
  const decodedSessionId = sessionId ? decodeURIComponent(sessionId) : '';
  const projectDir = searchParams.get('projectDir') ?? undefined;

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
  const providerName = PROVIDER_NAMES[validProvider] ?? provider;
  const providerColor = PROVIDER_COLORS[validProvider] ?? 'text-primary';
  const assistantLabel = ASSISTANT_LABELS[validProvider] ?? 'AI';

  const errorMsg = extractErrorMessage(error);

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
        <span className={`text-sm font-medium ${providerColor}`}>{providerName}</span>
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

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages in this session.
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border">
            {messages.map((msg, i) => (
              <div
                key={msg.uuid || i}
                className={`px-4 py-3 ${msg.type === 'user' ? 'bg-background' : 'bg-muted/20'}`}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  {msg.type === 'user' ? (
                    <User className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Bot className={`h-3.5 w-3.5 ${providerColor}`} />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {msg.type === 'user' ? 'You' : assistantLabel}
                  </span>
                  {msg.timestamp && (
                    <span className="ml-auto text-xs text-muted-foreground/60">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {msg.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
