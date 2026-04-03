import { Activity } from 'lucide-react';
import type { HealthResponse } from '../types';

export function HealthWidget({ health }: { health: HealthResponse | undefined }) {
  if (!health) return null;

  const uptimeHrs = Math.floor(health.uptime / 3600);
  const uptimeMins = Math.floor((health.uptime % 3600) / 60);

  return (
    <div className="col-span-2 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">System</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className={health.status === 'ok' ? 'text-success' : 'text-destructive'}>
          {health.status === 'ok' ? 'Online' : 'Error'}
        </span>
        <span>
          Uptime: {uptimeHrs > 0 ? `${uptimeHrs}h ` : ''}
          {uptimeMins}m
        </span>
        <span>{health.activeSessions} sessions</span>
      </div>
    </div>
  );
}
