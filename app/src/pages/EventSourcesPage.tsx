import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Plus, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { extractErrorMessage } from '../lib/format';
import { EventSourceItem } from '../components/EventSourceItem';
import { EventSourceForm } from '../components/EventSourceForm';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { HeaderSlot } from '../components/HeaderSlot';
import type { EventSource, CreateEventSourceRequest } from '../types';

export function EventSourcesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSource, setEditSource] = useState<EventSource | null>(null);

  const {
    data: sources = [],
    isLoading,
    isFetching,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['event-sources'],
    queryFn: () => api.listEventSources(),
    refetchInterval: 10000,
  });

  const createMutation = useCrudMutation(
    (data: CreateEventSourceRequest) => api.createEventSource(data),
    [['event-sources']],
  );

  const deleteMutation = useCrudMutation(
    (id: string) => api.deleteEventSource(id),
    [['event-sources']],
  );

  const togglePauseMutation = useCrudMutation(
    (source: EventSource) => {
      const newStatus = source.status === 'paused' ? 'active' : 'paused';
      return api.updateEventSource(source.id, { status: newStatus });
    },
    [['event-sources']],
  );

  const testMutation = useCrudMutation(
    (id: string) => api.testEventSource(id),
    [],
    {
      onSuccess: (result) => {
        if (result.triggered) {
          toast.success(`Triggered: ${result.details}`);
        } else {
          toast.info(`Not triggered: ${result.details}`);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Test failed');
      },
    },
  );

  const handleCreate = async (data: CreateEventSourceRequest) => {
    await createMutation.mutateAsync(data);
  };

  const handleUpdate = async (data: CreateEventSourceRequest) => {
    if (!editSource) return;
    await api.updateEventSource(editSource.id, data);
    setEditSource(null);
    void refetch();
  };

  const handleDelete = (id: string) => deleteMutation.mutate(id);
  const handleTogglePause = (source: EventSource) => togglePauseMutation.mutate(source);
  const handleTest = (id: string) => testMutation.mutate(id);

  const handleEdit = (source: EventSource) => {
    setEditSource(source);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditSource(null);
  };

  const error = extractErrorMessage(
    fetchError,
    deleteMutation.error,
    togglePauseMutation.error,
  );

  return (
    <div className="safe-area-bottom flex h-full flex-col">
      <HeaderSlot>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Source
        </Button>
      </HeaderSlot>

      <ErrorBanner error={error} />

      <main className="flex-1 overflow-y-auto">
        {isLoading && sources.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading event sources...</div>
          </div>
        ) : sources.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-16 w-16 text-muted-foreground/50" />}
            title="No event sources"
            description="Create an event source to trigger tasks based on real-world events"
            actionLabel="Create First Source"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="divide-y divide-border">
            {sources.map((source) => (
              <EventSourceItem
                key={source.id}
                source={source}
                onDelete={() => handleDelete(source.id)}
                onTogglePause={() => handleTogglePause(source)}
                onEdit={() => handleEdit(source)}
                onTest={() => handleTest(source.id)}
              />
            ))}
          </div>
        )}
      </main>

      <EventSourceForm
        isOpen={showForm}
        onClose={handleCloseForm}
        onSubmit={editSource ? handleUpdate : handleCreate}
        editSource={editSource || undefined}
      />
    </div>
  );
}
