/**
 * Deep Research page — launch research sessions, track progress, view reports.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Play,
  Trash2,
  FileText,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import { deepResearchApi } from '../api';
import type { ResearchSession, ResearchSummaryStats } from '../types';

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ResearchSession['status'] }) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    queued: {
      icon: <Clock className="h-3 w-3" />,
      label: 'Queued',
      className: 'bg-muted text-muted-foreground',
    },
    researching: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Researching',
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    compiling: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Compiling',
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    completed: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'Completed',
      className: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    failed: {
      icon: <XCircle className="h-3 w-3" />,
      label: 'Failed',
      className: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
  };
  const c = config[status] ?? config.queued;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Session card
// ---------------------------------------------------------------------------

function SessionCard({
  session,
  onView,
  onStart,
  onCancel,
  onDelete,
}: {
  session: ResearchSession;
  onView: () => void;
  onStart: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const isActive = session.status === 'researching' || session.status === 'compiling';
  const progress =
    session.stats.total_sources > 0
      ? Math.round((session.stats.sources_analyzed / session.stats.total_sources) * 100)
      : 0;

  return (
    <Card className="transition-all md:hover:border-primary/40">
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{session.topic}</h3>
            {session.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {session.description}
              </p>
            )}
          </div>
          <StatusBadge status={session.status} />
        </div>

        {/* Progress bar for active sessions */}
        {isActive && session.stats.total_sources > 0 && (
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {session.status === 'compiling'
                  ? 'Compiling report…'
                  : `Analyzing sources (${session.stats.sources_analyzed}/${session.stats.total_sources})`}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${session.status === 'compiling' ? 90 : progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {session.strategy === 'breadth' ? 'Broad' : 'Deep'}
          </span>
          {session.stats.queries_executed > 0 && (
            <span className="inline-flex items-center gap-1">
              <Search className="h-3 w-3" />
              {session.stats.queries_executed} queries
            </span>
          )}
          {session.stats.total_sources > 0 && (
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {session.stats.total_sources} sources
            </span>
          )}
          {session.duration_ms > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(session.duration_ms / 1000)}s
            </span>
          )}
        </div>

        {/* Error message */}
        {session.error && (
          <p className="mb-2 rounded bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-400">
            {session.error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {session.status === 'completed' && (
            <Button variant="default" size="sm" onClick={onView}>
              <FileText className="mr-1 h-3 w-3" /> View Report
            </Button>
          )}
          {(session.status === 'queued' || session.status === 'failed') && (
            <Button variant="default" size="sm" onClick={onStart}>
              <Play className="mr-1 h-3 w-3" /> Start
            </Button>
          )}
          {isActive && (
            <Button variant="secondary" size="sm" onClick={onCancel}>
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
          )}
          {!isActive && (
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Report viewer
// ---------------------------------------------------------------------------

function ReportViewer({
  session,
  onClose,
}: {
  session: ResearchSession;
  onClose: () => void;
}) {
  const [showSources, setShowSources] = useState(false);
  const citedSources = session.sources.filter((s) => s.used_in_report);
  const allSources = session.sources;

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{session.topic}</h2>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{session.stats.total_sources} sources</span>
            <span>·</span>
            <span>{Math.round(session.duration_ms / 1000)}s</span>
            <span>·</span>
            <span>{new Date(session.completed_at).toLocaleDateString()}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Report content — rendered as prose */}
      <Card>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none p-4">
          <ReportMarkdown content={session.report} />
        </CardContent>
      </Card>

      {/* Sources accordion */}
      <button
        onClick={() => setShowSources(!showSources)}
        className="flex w-full items-center justify-between rounded-lg border p-3 text-sm font-medium transition-colors md:hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Sources ({allSources.length})
          {citedSources.length > 0 && (
            <span className="text-xs text-muted-foreground">
              · {citedSources.length} cited
            </span>
          )}
        </span>
        {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showSources && (
        <div className="space-y-2">
          {allSources.map((source, i) => (
            <div
              key={`${source.url}-${i}`}
              className="rounded-lg border p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary md:hover:underline"
                  >
                    {source.title || source.domain}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="mt-0.5 text-xs text-muted-foreground">{source.domain}</p>
                </div>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    source.credibility_score >= 80
                      ? 'bg-green-500/10 text-green-600'
                      : source.credibility_score >= 60
                        ? 'bg-yellow-500/10 text-yellow-600'
                        : 'bg-red-500/10 text-red-600'
                  }`}
                >
                  {source.credibility_score}
                </span>
              </div>
              {source.snippet && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.snippet}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple markdown renderer (headings, bold, links, lists, paragraphs)
// ---------------------------------------------------------------------------

function ReportMarkdown({ content }: { content: string }) {
  if (!content) return <p className="text-muted-foreground">No report content.</p>;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`}>
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      if (level === 1) elements.push(<h1 key={i}>{renderInline(text)}</h1>);
      else if (level === 2) elements.push(<h2 key={i}>{renderInline(text)}</h2>);
      else if (level === 3) elements.push(<h3 key={i}>{renderInline(text)}</h3>);
      else elements.push(<h4 key={i}>{renderInline(text)}</h4>);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={i} />);
      continue;
    }

    // Unordered list item
    const ulMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list item
    const olMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    // Paragraph
    flushList();
    elements.push(<p key={i}>{renderInline(trimmed)}</p>);
  }

  flushList();
  return <>{elements}</>;
}

/** Render inline markdown (bold, italic, links, code, citations). */
function renderInline(text: string): React.ReactNode {
  // Split on markdown patterns: **bold**, *italic*, `code`, [text](url), [n]
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }

    // Inline code
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(<code key={key++}>{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }

    // Links [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)/s);
    if (linkMatch) {
      if (linkMatch[1]) parts.push(linkMatch[1]);
      parts.push(
        <a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
      continue;
    }

    // No more patterns — push the rest
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ---------------------------------------------------------------------------
// New Research Form
// ---------------------------------------------------------------------------

function NewResearchForm({ onSubmit, loading }: { onSubmit: (topic: string, description: string, strategy: 'breadth' | 'depth') => void; loading: boolean }) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<'breadth' | 'depth'>('breadth');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!topic.trim()) return;
    onSubmit(topic.trim(), description.trim(), strategy);
    setTopic('');
    setDescription('');
    setExpanded(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter a research topic…"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && topic.trim()) handleSubmit();
            }}
            className="flex-1"
          />
          <Button onClick={handleSubmit} disabled={!topic.trim() || loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
            Research
          </Button>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground md:hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Advanced options
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <Textarea
              placeholder="Optional description or specific questions to answer…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Strategy</p>
              <div className="flex gap-2">
                <Button
                  variant={strategy === 'breadth' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStrategy('breadth')}
                >
                  🌐 Breadth-first
                </Button>
                <Button
                  variant={strategy === 'depth' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStrategy('depth')}
                >
                  🔬 Depth-first
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {strategy === 'breadth'
                  ? 'Covers many angles and perspectives for a broad overview.'
                  : 'Goes deep into technical details and specific subtopics.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function DeepResearch() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [stats, setStats] = useState<ResearchSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewingSession, setViewingSession] = useState<ResearchSession | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionList, summaryStats] = await Promise.all([
        deepResearchApi.list(),
        deepResearchApi.stats(),
      ]);
      setSessions(sessionList);
      setStats(summaryStats);

      // Auto-refresh viewed session if it's active
      if (viewingSession && ['researching', 'compiling'].includes(viewingSession.status)) {
        const updated = sessionList.find((s) => s.id === viewingSession.id);
        if (updated) setViewingSession(updated);
      }
    } catch (err) {
      console.error('[deep-research] Refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, [viewingSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh when there are active sessions
  useEffect(() => {
    const hasActive = sessions.some(
      (s) => s.status === 'researching' || s.status === 'compiling'
    );
    if (!hasActive) return;

    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [sessions, refresh]);

  const handleSubmit = async (topic: string, description: string, strategy: 'breadth' | 'depth') => {
    try {
      setSubmitting(true);
      await deepResearchApi.quickStart({ topic, description, strategy });
      await refresh();
    } catch (err) {
      console.error('[deep-research] Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await deepResearchApi.start(id);
      await refresh();
    } catch (err) {
      console.error('[deep-research] Start failed:', err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await deepResearchApi.cancel(id);
      await refresh();
    } catch (err) {
      console.error('[deep-research] Cancel failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deepResearchApi.delete(id);
      if (viewingSession?.id === id) setViewingSession(null);
      await refresh();
    } catch (err) {
      console.error('[deep-research] Delete failed:', err);
    }
  };

  const handleView = (session: ResearchSession) => {
    setViewingSession(session);
  };

  // Filter sessions
  const filtered = sessions.filter((s) => {
    if (filter === 'active') return s.status === 'researching' || s.status === 'compiling';
    if (filter === 'completed') return s.status === 'completed';
    if (filter === 'failed') return s.status === 'failed';
    return true;
  });

  // Report viewer mode
  if (viewingSession?.status === 'completed' && viewingSession.report) {
    return (
      <div className="h-full overflow-auto p-4">
        <HeaderSlot>
          <Button variant="ghost" size="icon" onClick={() => setViewingSession(null)}>
            <X className="h-4 w-4" />
          </Button>
        </HeaderSlot>
        <ReportViewer session={viewingSession} onClose={() => setViewingSession(null)} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      <HeaderSlot>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </HeaderSlot>

      <div className="space-y-4 pb-20">
        {/* Stat cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<FileText className="h-4 w-4" />}
              label="Completed"
              value={String(stats.completed)}
            />
            <StatCard
              icon={<Globe className="h-4 w-4" />}
              label="Sources"
              value={String(stats.totalSources)}
            />
            <StatCard
              icon={<Search className="h-4 w-4" />}
              label="Queries"
              value={String(stats.totalQueries)}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Avg Duration"
              value={stats.avgDurationMs > 0 ? `${Math.round(stats.avgDurationMs / 1000)}s` : '—'}
            />
          </div>
        )}

        {/* New research form */}
        <NewResearchForm onSubmit={handleSubmit} loading={submitting} />

        {/* Filter pills */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(['all', 'active', 'completed', 'failed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="shrink-0"
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'active' && stats && stats.inProgress > 0 && (
                <span className="ml-1 rounded-full bg-blue-500/20 px-1.5 text-xs">{stats.inProgress}</span>
              )}
            </Button>
          ))}
        </div>

        {/* Sessions list */}
        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {sessions.length === 0
                ? 'No research sessions yet. Enter a topic above to get started.'
                : 'No sessions match this filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onView={() => handleView(session)}
                onStart={() => handleStart(session.id)}
                onCancel={() => handleCancel(session.id)}
                onDelete={() => handleDelete(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
