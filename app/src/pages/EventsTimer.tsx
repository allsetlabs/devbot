import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCrudMutation } from '../hooks/useCrudMutation';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Timer, Menu, Globe } from 'lucide-react';
import { api } from '../lib/api';
import { EditEntryDrawer } from '../components/EditEntryDrawer';
import { EventEntryItem } from '../components/EventEntryItem';
import { useNav } from '../hooks/useNav';
import {
  useWakeLock,
  useGeoInfo,
  useLiveTime,
  formatTime,
  formatMs,
  formatFullDate,
  formatTimeDiff,
  formatLiveElapsed,
  formatEntryTime,
  formatEntryDate,
} from '../lib/event-timer-utils';
import type { EventTimerEntry } from '../types';

export function EventsTimer() {
  const { openNav } = useNav();
  const [editEntry, setEditEntry] = useState<EventTimerEntry | null>(null);

  const now = useLiveTime();
  const geo = useGeoInfo();
  useWakeLock();

  const {
    data: entries = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['event-timer-entries'],
    queryFn: () => api.listEventTimerEntries(),
  });

  const createMutation = useCrudMutation(
    (recordedAt: string) =>
      api.createEventTimerEntry({
        recordedAt,
        timezone: geo.timezone,
        latitude: geo.latitude,
        longitude: geo.longitude,
        locationName: geo.locationName,
        city: geo.city,
        state: geo.state,
        country: geo.country,
        fullAddress: geo.fullAddress,
      }),
    [['event-timer-entries']]
  );

  const deleteMutation = useCrudMutation(
    (id: string) => api.deleteEventTimerEntry(id),
    [['event-timer-entries']]
  );

  const updateMutation = useCrudMutation(
    ({ id, name, description }: { id: string; name: string | null; description: string | null }) =>
      api.updateEventTimerEntry(id, { name, description }),
    [['event-timer-entries']],
    { onSuccess: () => setEditEntry(null) }
  );

  const error =
    fetchError instanceof Error
      ? fetchError.message
      : createMutation.error instanceof Error
        ? createMutation.error.message
        : deleteMutation.error instanceof Error
          ? deleteMutation.error.message
          : updateMutation.error instanceof Error
            ? updateMutation.error.message
            : null;

  const latestEntry = entries.length > 0 ? entries[0] : null;

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={openNav} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Timer className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Events Timer</h1>
        </div>
      </header>

      {error && (
        <div className="border-b border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 pb-4 pt-6">
          <div className="text-center">
            <p className="font-mono text-4xl font-bold tracking-wide text-foreground">
              {formatTime(now)}
              <span className="text-xl text-primary">.{formatMs(now)}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{formatFullDate(now)}</p>
          </div>

          <div className="mt-5 w-full max-w-sm rounded-lg border border-border bg-card p-3.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate">{geo.timezone}</span>
            </div>
          </div>

          <Button
            className="mt-6 h-14 w-full max-w-sm text-lg font-semibold"
            onClick={() => createMutation.mutate(new Date().toISOString())}
            disabled={createMutation.isPending}
          >
            <Timer className="mr-2 h-5 w-5" />
            {createMutation.isPending ? 'Recording...' : 'Record Event'}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tap to capture the exact moment — delete wrong entries below
          </p>
        </div>

        {latestEntry && (
          <div className="mx-4 mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="mb-1 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Since last event{latestEntry.name ? ` — ${latestEntry.name}` : ''}
            </p>
            <p className="text-center font-mono text-2xl font-bold text-primary">
              {formatLiveElapsed(latestEntry.recordedAt, now)}
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {formatEntryDate(latestEntry.recordedAt)} at {formatEntryTime(latestEntry.recordedAt)}
            </p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="px-4 pb-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Recorded Events</h2>
            <div>
              {entries.map((entry, idx) => (
                <div key={entry.id}>
                  {idx > 0 && (
                    <div className="flex items-center justify-center py-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatTimeDiff(entries[idx - 1].recordedAt, entry.recordedAt)}
                      </span>
                    </div>
                  )}
                  <EventEntryItem
                    entry={entry}
                    index={idx}
                    total={entries.length}
                    onEdit={setEditEntry}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">Loading entries...</span>
          </div>
        )}
      </main>

      <EditEntryDrawer
        entry={editEntry}
        isPending={updateMutation.isPending}
        onClose={() => setEditEntry(null)}
        onSave={(id, name, description) => updateMutation.mutate({ id, name, description })}
      />
    </div>
  );
}
