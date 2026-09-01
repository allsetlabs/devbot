import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import {
  Mic,
  Search,
  Trash2,
  BarChart3,
  BookOpen,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  voiceTranscriptsApi,
  type VoiceTranscript,
  type VoiceTranscriptStats,
} from '../lib/api';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function TranscriptCard({
  transcript,
  onDelete,
}: {
  transcript: VoiceTranscript;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const userMsgs = transcript.messages.filter((m) => m.role === 'user');
  const hasDiffs = transcript.messages.some((m) => m.rawStt && m.rawStt !== m.content);

  return (
    <div className="rounded-lg border bg-card">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 md:hover:bg-muted/30 active:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-violet-500 shrink-0" />
            <span className="text-sm font-medium truncate">
              {userMsgs[0]?.content.slice(0, 60) || 'Empty session'}
              {(userMsgs[0]?.content.length ?? 0) > 60 ? '…' : ''}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(transcript.sessionStartedAt)}</span>
            <span>{transcript.messageCount} msgs</span>
            <span>{formatDuration(transcript.durationSeconds)}</span>
            {hasDiffs && <span className="text-amber-500">STT diffs</span>}
            {transcript.analyzed && <span className="text-green-500">Analyzed</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground md:hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(transcript.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
          {transcript.messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                {msg.role === 'user' ? 'You' : 'AI'}
              </span>
              <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-primary' : 'text-foreground'}`}>
                {msg.content}
              </p>
              {msg.rawStt && msg.rawStt !== msg.content && (
                <p className="text-xs text-amber-500/70 italic mt-0.5">
                  STT: {msg.rawStt}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VoiceTranscriptsPage() {
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [stats, setStats] = useState<VoiceTranscriptStats | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        voiceTranscriptsApi.list({ search: search || undefined, sort: 'created_at', order: 'desc' }),
        voiceTranscriptsApi.stats(),
      ]);
      setTranscripts(t);
      setStats(s);
    } catch (err) {
      console.error('[transcripts] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await voiceTranscriptsApi.delete(id);
      setTranscripts((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('[transcripts] delete error:', err);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await voiceTranscriptsApi.analyze();
      await fetchData();
    } catch (err) {
      console.error('[transcripts] analyze error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search transcripts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      {showStats && stats && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Mic} label="Sessions" value={stats.totalSessions} />
          <StatCard icon={MessageSquare} label="Messages" value={stats.totalMessages} />
          <StatCard icon={Clock} label="Total Time" value={stats.totalDurationFormatted} />
          <StatCard icon={BookOpen} label="Dictionary" value={`${stats.dictionaryEntries} entries`} />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => setShowStats(!showStats)}
        >
          <BarChart3 className="mr-1 h-3 w-3" />
          {showStats ? 'Hide stats' : 'Show stats'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={analyzing || !stats || stats.unanalyzedCount === 0}
          onClick={handleAnalyze}
        >
          {analyzing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
          Analyze{stats && stats.unanalyzedCount > 0 ? ` (${stats.unanalyzedCount})` : ''}
        </Button>
      </div>

      {/* Transcript list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : transcripts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Mic className="h-10 w-10 opacity-30" />
          <p className="text-sm">No voice transcripts yet</p>
          <p className="text-xs">Start a voice conversation to see transcripts here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transcripts.map((t) => (
            <TranscriptCard key={t.id} transcript={t} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
