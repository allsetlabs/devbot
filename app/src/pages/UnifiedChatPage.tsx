import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, FolderOpen } from 'lucide-react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { unifiedChatApi } from '../lib/api';
import { HeaderSlot } from '../components/HeaderSlot';
import { ErrorBanner } from '../components/ErrorBanner';
import { extractErrorMessage } from '../lib/format';
import type { UnifiedDir } from '../types';

export function UnifiedChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['unified-dirs'],
    queryFn: () => unifiedChatApi.listDirs(),
  });

  const dirs = data?.dirs ?? [];
  const defaultDir = data?.defaultDir ?? null;

  useEffect(() => {
    if (defaultDir) {
      navigate(`/unified/dir/${encodeURIComponent(defaultDir)}`, { replace: true });
    }
  }, [defaultDir, navigate]);

  const setDefaultMutation = useMutation({
    mutationFn: (encoded: string) => unifiedChatApi.setDefaultDir(encoded),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['unified-dirs'] });
      if (result.defaultDir) {
        navigate(`/unified/dir/${encodeURIComponent(result.defaultDir)}`);
      }
    },
  });

  const handleSelect = (dir: UnifiedDir) => {
    navigate(`/unified/dir/${encodeURIComponent(dir.encoded)}`);
  };

  const handleSetDefault = (e: React.MouseEvent, dir: UnifiedDir) => {
    e.stopPropagation();
    setDefaultMutation.mutate(dir.encoded);
  };

  const errorMsg = extractErrorMessage(error);

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <HeaderSlot>
        <span className="text-xs text-muted-foreground">Pick a project</span>
      </HeaderSlot>

      <ErrorBanner error={errorMsg} />

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading projects...</div>
          </div>
        ) : dirs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <Layers className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h2 className="text-lg font-semibold">No Claude projects found</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a Claude Code session in any terminal to see it here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dirs.map((dir) => (
              <div
                key={dir.encoded}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 active:bg-accent md:hover:bg-accent"
                onClick={() => handleSelect(dir)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleSelect(dir)}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{dir.displayPath}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dir.sessionCount} session{dir.sessionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={(e) => handleSetDefault(e, dir)}
                  disabled={setDefaultMutation.isPending}
                >
                  Set Default
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
