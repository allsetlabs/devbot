import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  Check,
  RefreshCw,
  Search,
  X,
  Terminal,
  ExternalLink,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { unifiedChatApi } from '../lib/api';
import { HeaderSlot } from '../components/HeaderSlot';
import { ErrorBanner } from '../components/ErrorBanner';
import { ProviderIcon, ProviderBadge, PROVIDER_META } from '../components/ProviderIcon';
import { extractErrorMessage, formatRelativeTime } from '../lib/format';
import type {
  CLIProvider,
  ProviderSession,
} from '../types';

// ─── Sort ───────────────────────────────────────────────────────────

type SortOption = 'recent' | 'oldest';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recent First' },
  { value: 'oldest', label: 'Oldest First' },
];

// ─── Component ──────────────────────────────────────────────────────

export function CLIDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const providerFilter = (searchParams.get('provider') as CLIProvider) ?? undefined;
  const searchQuery = searchParams.get('q') ?? '';
  const sortBy = (searchParams.get('sort') as SortOption) ?? 'recent';

  const setSearchQuery = (value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('q', value);
      else next.delete('q');
      return next;
    }, { replace: true });
  };

  const setProviderFilter = (provider: CLIProvider | undefined) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (provider) next.set('provider', provider);
      else next.delete('provider');
      return next;
    }, { replace: true });
  };

  const setSortBy = (value: SortOption) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value !== 'recent') next.set('sort', value);
      else next.delete('sort');
      return next;
    }, { replace: true });
  };

  // ─── Queries ────────────────────────────────────────────────────

  const {
    data: providersData,
    isLoading: providersLoading,
    error: providersError,
  } = useQuery({
    queryKey: ['cli-providers'],
    queryFn: () => unifiedChatApi.listProviders(),
    staleTime: 30_000,
  });

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isFetching,
    error: sessionsError,
    refetch,
  } = useQuery({
    queryKey: ['cli-all-sessions', providerFilter, searchQuery],
    queryFn: () => unifiedChatApi.listAllSessions(providerFilter, 200, searchQuery || undefined),
    staleTime: 10_000,
  });

  const refreshMutation = useMutation({
    mutationFn: () => unifiedChatApi.refreshCache(),
    onSuccess: () => {
      refetch();
      toast.success('Cache refreshed');
    },
  });

  const providers = providersData?.providers ?? [];
  const availableProviders = providers.filter((p) => p.available && p.sessionCount > 0);
  const allSessions = sessionsData?.sessions ?? [];

  // Sort
  const sorted = [...allSessions].sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });

  const isLoading = providersLoading || sessionsLoading;
  const error = providersError || sessionsError;
  const errorMsg = extractErrorMessage(error);
  const totalSessions = providers.reduce((sum, p) => sum + p.sessionCount, 0);

  const handleSessionClick = (session: ProviderSession) => {
    const params = session.projectDir ? `?projectDir=${encodeURIComponent(session.projectDir)}` : '';
    navigate(`/unified/session/${session.provider}/${encodeURIComponent(session.sessionId)}${params}`);
  };

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <HeaderSlot>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refreshMutation.mutate()}
          disabled={isFetching || refreshMutation.isPending}
          title="Refresh"
        >
          <RefreshCw
            className={`h-5 w-5 ${isFetching || refreshMutation.isPending ? 'animate-spin' : ''}`}
          />
        </Button>
      </HeaderSlot>

      <ErrorBanner error={errorMsg} />

      <main className="flex-1 overflow-y-auto">
        {/* Provider summary cards */}
        {availableProviders.length > 0 && (
          <div className="border-b border-border px-4 py-3">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {/* All button */}
              <button
                className={`flex flex-shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  !providerFilter
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background md:hover:bg-muted/50 active:bg-muted/50'
                }`}
                onClick={() => setProviderFilter(undefined)}
              >
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">All</p>
                  <p className="text-[10px] text-muted-foreground">{totalSessions}</p>
                </div>
              </button>
              {availableProviders.map((p) => {
                const meta = PROVIDER_META[p.id];
                return (
                  <button
                    key={p.id}
                    className={`flex flex-shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                      providerFilter === p.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background md:hover:bg-muted/50 active:bg-muted/50'
                    }`}
                    onClick={() =>
                      setProviderFilter(providerFilter === p.id ? undefined : p.id)
                    }
                  >
                    <ProviderIcon provider={p.id} size={18} />
                    <div>
                      <p className="text-xs font-medium">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.sessionCount} session{p.sessionCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + sort bar */}
        <div className="border-b border-border px-4 py-2">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions…"
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => setSortDropdownOpen((o) => !o)}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-40 rounded-lg border border-border bg-popover shadow-lg">
                  {SORT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant="ghost"
                      className="flex w-full items-center justify-start gap-2 rounded-none px-3 py-2 text-sm first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => {
                        setSortBy(option.value);
                        setSortDropdownOpen(false);
                      }}
                    >
                      {sortBy === option.value && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      <span className={sortBy !== option.value ? 'ml-6' : ''}>
                        {option.label}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sessions list */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-muted-foreground">Loading sessions…</div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 px-6 text-center">
            <Terminal className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h2 className="text-lg font-semibold">
                {searchQuery
                  ? 'No matching sessions'
                  : providerFilter
                    ? `No ${PROVIDER_META[providerFilter].label} sessions found`
                    : 'No CLI sessions found'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? `No sessions match "${searchQuery}"`
                  : 'Start a Claude Code, Codex, or Kimi Code session to see it here.'}
              </p>
            </div>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((session) => (
              <SessionRow
                key={`${session.provider}-${session.sessionId}`}
                session={session}
                onClick={() => handleSessionClick(session)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Session Row ────────────────────────────────────────────────────

function SessionRow({
  session,
  onClick,
}: {
  session: ProviderSession;
  onClick: () => void;
}) {
  const meta = PROVIDER_META[session.provider];

  // Extract a short directory name from cwd
  const shortCwd = session.cwd
    ? session.cwd.split('/').filter(Boolean).slice(-2).join('/')
    : '';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-muted/50 md:hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Provider icon */}
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${meta.bgColor}`}
      >
        <ProviderIcon provider={session.provider} size={22} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {session.preview || session.sessionId.slice(0, 12)}
          </p>
          <ProviderBadge provider={session.provider} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelativeTime(session.updatedAt)}</span>
          {shortCwd && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5 truncate">
                <FolderOpen className="h-3 w-3 shrink-0" />
                <span className="truncate">{shortCwd}</span>
              </span>
            </>
          )}
          {session.messageCount > 0 && (
            <>
              <span>·</span>
              <span>{session.messageCount} msgs</span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
    </div>
  );
}
