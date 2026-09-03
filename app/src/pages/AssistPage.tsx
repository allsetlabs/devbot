import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import {
  Card,
  CardContent,
} from '@allsetlabs/forge/components/ui/card';
import { toast } from 'sonner';
import { HeaderSlot } from '../components/HeaderSlot';
import {
  assistApi,
  type AssistRequest,
  type AssistRequestStatus,
  type AssistRequestSource,
} from '../lib/assistApi';
import {
  HandHelping,
  Terminal,
  Clock,
  MessageCircle,
  Blocks,
  Settings,
  RefreshCw,
  Send,
  X,
  Trash2,
  Check,
  CheckCircle2,
  XCircle,
  Timer,
  Loader2,
  Inbox,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<AssistRequestSource, { label: string; icon: typeof Terminal; color: string }> = {
  terminal: { label: 'Terminal', icon: Terminal, color: 'text-emerald-500' },
  scheduler: { label: 'Scheduler', icon: Clock, color: 'text-blue-500' },
  chat: { label: 'Chat', icon: MessageCircle, color: 'text-purple-500' },
  plugin: { label: 'Plugin', icon: Blocks, color: 'text-amber-500' },
  system: { label: 'System', icon: Settings, color: 'text-red-500' },
};

const STATUS_CONFIG: Record<AssistRequestStatus, { label: string; icon: typeof Check; color: string; bg: string }> = {
  pending: { label: 'Pending', icon: Loader2, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950' },
  replied: { label: 'Replied', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
  expired: { label: 'Expired', icon: Timer, color: 'text-muted-foreground', bg: 'bg-muted' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

// ─── AssistRequestCard ──────────────────────────────────────────────────

function AssistRequestCard({
  request,
  onReply,
  onCancel,
  onDelete,
}: {
  request: AssistRequest;
  onReply: (id: string, reply: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(request.status === 'pending');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const src = SOURCE_CONFIG[request.source] || SOURCE_CONFIG.terminal;
  const status = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const SrcIcon = src.icon;
  const StatusIcon = status.icon;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onReply(request.id, replyText.trim());
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Auto-focus textarea for pending requests
  useEffect(() => {
    if (request.status === 'pending' && expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [request.status, expanded]);

  return (
    <Card
      className={`transition-all ${
        request.status === 'pending'
          ? 'border-l-4 border-l-amber-500 shadow-md'
          : request.status === 'replied'
            ? 'border-l-4 border-l-green-500 opacity-80'
            : 'opacity-60'
      }`}
    >
      <CardContent className="p-3">
        {/* Header row */}
        <div
          className="flex cursor-pointer items-start gap-3"
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => e.key === 'Enter' && setExpanded(!expanded)}
          role="button"
          tabIndex={0}
        >
          {/* Source icon */}
          <div className={`mt-0.5 flex-shrink-0 ${src.color}`}>
            <SrcIcon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium line-clamp-1">
                {request.question}
              </span>
            </div>
            {request.context && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {request.context}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium ${status.bg} ${status.color}`}>
                <StatusIcon className={`h-3 w-3 ${request.status === 'pending' ? 'animate-spin' : ''}`} />
                {status.label}
              </span>
              <span>{formatTime(request.created_at)}</span>
              <span>·</span>
              <span>{src.label}</span>
              {request.sourceLabel && (
                <>
                  <span>·</span>
                  <span>{request.sourceLabel}</span>
                </>
              )}
              {request.ttlSeconds > 0 && (
                <>
                  <span>·</span>
                  <span>TTL: {request.ttlSeconds}s</span>
                </>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-shrink-0 items-center gap-1">
            {request.status === 'pending' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground md:hover:text-foreground"
                onClick={(e) => { e.stopPropagation(); onCancel(request.id); }}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive/60 md:hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(request.id); }}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 border-t pt-3">
            {/* Full question */}
            <div className="mb-3 rounded-lg bg-muted/50 p-3">
              <p className="whitespace-pre-wrap text-sm">{request.question}</p>
              {request.context && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">Context</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                    {request.context}
                  </p>
                </div>
              )}
            </div>

            {/* Reply display (for replied requests) */}
            {request.status === 'replied' && request.reply && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/50">
                <p className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">
                  Your reply {request.repliedAt && `· ${formatTime(request.repliedAt)}`}
                </p>
                <p className="whitespace-pre-wrap text-sm">{request.reply}</p>
              </div>
            )}

            {/* Reply input (for pending requests) */}
            {request.status === 'pending' && (
              <div className="space-y-2">
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your reply… (Enter to send, Shift+Enter for newline)"
                  rows={3}
                  className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(request.id)}
                    className="text-xs"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="text-xs"
                  >
                    {sending ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-3.5 w-3.5" />
                    )}
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export function AssistPage() {
  const [requests, setRequests] = useState<AssistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<AssistRequestStatus | ''>('');

  const loadRequests = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await assistApi.list(params as Parameters<typeof assistApi.list>[0]);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load assist requests:', err);
    }
  }, [statusFilter]);

  const loadPendingCount = useCallback(async () => {
    try {
      const { count } = await assistApi.pendingCount();
      setPendingCount(count);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadRequests(), loadPendingCount()]);
    setLoading(false);
  }, [loadRequests, loadPendingCount]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function init() {
      await Promise.all([loadRequests(), loadPendingCount()]);
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [loadRequests, loadPendingCount]);

  // Auto-refresh: fast (5s) when there are pending requests, slow (30s) otherwise
  useEffect(() => {
    const interval = setInterval(
      () => {
        loadRequests();
        loadPendingCount();
      },
      pendingCount > 0 ? 5_000 : 30_000
    );
    return () => clearInterval(interval);
  }, [loadRequests, loadPendingCount, pendingCount]);

  const handleReply = async (id: string, reply: string) => {
    try {
      const updated = await assistApi.reply(id, reply);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setPendingCount((c) => Math.max(0, c - 1));
      toast.success('Reply sent');
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const updated = await assistApi.cancel(id);
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setPendingCount((c) => Math.max(0, c - 1));
      toast.success('Request cancelled');
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await assistApi.delete(id);
      const removed = requests.find((r) => r.id === id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (removed && removed.status === 'pending') {
        setPendingCount((c) => Math.max(0, c - 1));
      }
    } catch {
      toast.error('Failed to delete request');
    }
  };

  const statuses: { value: AssistRequestStatus | ''; label: string }[] = [
    { value: '', label: 'All' },
    { value: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { value: 'replied', label: 'Replied' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="h-full overflow-auto">
      <HeaderSlot>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </HeaderSlot>

      <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
        {/* Stats bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <HandHelping className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {pendingCount > 0
                  ? `${pendingCount} awaiting reply`
                  : 'No pending requests'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {requests.length} total
            </span>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === s.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground md:hover:bg-muted/80'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Request list */}
        {loading && requests.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No assist requests</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              When a terminal or agent needs your input, requests appear here
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-left">
              <p className="mb-1 text-xs font-medium text-muted-foreground">From any terminal:</p>
              <code className="text-xs text-primary">devbot-ask &quot;Your question here&quot;</code>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <AssistRequestCard
                key={r.id}
                request={r}
                onReply={handleReply}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
