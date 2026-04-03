import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Plus, Terminal } from 'lucide-react';
import { api } from '../lib/api';
import { extractErrorMessage } from '../lib/format';
import { ChatItem } from '../components/ChatItem';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { SlideNav } from '../components/SlideNav';
import { ListPageHeader } from '../components/ListPageHeader';
import type { Session } from '../types';

export function ChatList() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const {
    data: sessions = [],
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.listSessions(),
  });

  const createMutation = useCrudMutation(() => api.createSession(), [['sessions']], {
    onSuccess: (session) => navigate(`/cli/${session.id}`),
  });

  const deleteMutation = useCrudMutation((id: string) => api.deleteSession(id), [['sessions']]);

  const handleCreateSession = () => createMutation.mutate();
  const handleDeleteSession = (id: string) => deleteMutation.mutate(id);

  const handleSelectSession = (session: Session) => {
    navigate(`/cli/${session.id}`);
  };

  const creating = createMutation.isPending;
  const error = extractErrorMessage(fetchError, createMutation.error, deleteMutation.error);

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      {/* Navigation Drawer */}
      <SlideNav isOpen={navOpen} onClose={() => setNavOpen(false)} />

      <ListPageHeader
        icon={<Terminal className="h-6 w-6 text-primary" />}
        title="CLI"
        onMenuClick={() => setNavOpen(true)}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      >
        <Button onClick={handleCreateSession} disabled={creating}>
          <Plus className="mr-1 h-4 w-4" />
          {creating ? 'Creating...' : 'New CLI'}
        </Button>
      </ListPageHeader>

      {/* Error Banner */}
      <ErrorBanner error={error} />

      {/* Session List */}
      <main className="flex-1 overflow-y-auto">
        {isLoading && sessions.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading sessions...</div>
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<Terminal className="h-16 w-16 text-muted-foreground/50" />}
            title="No active sessions"
            description="Create a new CLI session to start talking with Claude Code"
            actionLabel={creating ? 'Creating...' : 'Create First CLI'}
            onAction={handleCreateSession}
            actionDisabled={creating}
          />
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <ChatItem
                key={session.id}
                session={session}
                onSelect={() => handleSelectSession(session)}
                onDelete={() => handleDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
