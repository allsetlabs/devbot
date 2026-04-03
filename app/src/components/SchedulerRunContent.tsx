import { Clock, Loader2 } from 'lucide-react';
import { InteractiveChatView } from '../pages/InteractiveChatView';
import type { TaskRun } from '../types/index';

interface SchedulerRunContentProps {
  runs: TaskRun[];
  selectedRun: TaskRun | undefined;
}

export function SchedulerRunContent({ runs, selectedRun }: SchedulerRunContentProps) {
  if (runs.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
        <Clock className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-center text-sm text-muted-foreground">
          No runs yet. The task will run automatically based on its schedule.
        </p>
      </main>
    );
  }

  if (selectedRun?.chatId) {
    return (
      <div key={selectedRun.chatId} className="min-h-0 flex-1">
        <InteractiveChatView
          chatId={selectedRun.chatId}
          embedded
          initialIsRunning={selectedRun.status === 'running'}
        />
      </div>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
      {selectedRun?.status === 'running' ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center text-sm text-muted-foreground">Waiting for output...</p>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">No messages in this run</p>
      )}
    </main>
  );
}
