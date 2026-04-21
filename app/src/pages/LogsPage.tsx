import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@allsetlabs/reusable/components/ui/tabs';
import { Menu, RefreshCw, Trash2, ArrowDown } from 'lucide-react';
import { api } from '../lib/api';
import { useNav } from '../hooks/useNav';

type LogSource = 'frontend' | 'backend';

export function LogsPage() {
  const { openNav } = useNav();
  const [activeTab, setActiveTab] = useState<LogSource>('backend');
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLPreElement>(null);
  const query = useQuery({
    queryKey: ['logs', activeTab],
    queryFn: () => api.getLogs(activeTab, 500),
    refetchInterval: 3000,
  });

  const content = query.data?.content ?? '';
  const totalLines = query.data?.totalLines ?? 0;
  const lastModified = query.data?.lastModified ?? null;
  const loading = query.isLoading;

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  const clearMutation = useCrudMutation(() => api.clearLogs(activeTab), [['logs', activeTab]]);

  const handleClear = () => {
    clearMutation.mutate();
  };

  const handleScroll = () => {
    if (!logRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="safe-area-top flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={openNav} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Logs</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-4 py-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LogSource)}>
          <TabsList className="w-full">
            <TabsTrigger value="backend" className="flex-1">
              Backend
            </TabsTrigger>
            <TabsTrigger value="frontend" className="flex-1">
              Frontend
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-xs text-muted-foreground">
        <span>{totalLines} lines</span>
        {lastModified && <span>Updated {new Date(lastModified).toLocaleTimeString()}</span>}
      </div>

      {/* Log content */}
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={logRef}
          onScroll={handleScroll}
          className="h-full overflow-auto whitespace-pre-wrap break-words bg-background p-4 font-mono text-xs leading-relaxed text-foreground"
        >
          {content ||
            (loading
              ? 'Loading...'
              : 'No logs yet. Start DevBot services with `make run-d` to generate logs.')}
        </pre>

        {/* Scroll to bottom button */}
        {!autoScroll && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
