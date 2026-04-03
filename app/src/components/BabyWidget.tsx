import { useNavigate } from 'react-router-dom';
import { Button } from '@subbiah/reusable/components/ui/button';
import { Baby, ChevronRight, Milk, Droplets } from 'lucide-react';
import { formatRelativeTime } from '../lib/format';
import type { BabyLog } from '@devbot/plugin-baby-logs/frontend';

export function BabyWidget({ logs }: { logs: BabyLog[] }) {
  const navigate = useNavigate();

  const lastFeed = logs.find((l) => l.logType === 'feeding');
  const lastDiaper = logs.find((l) => l.logType === 'diaper');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayFeedings = logs.filter(
    (l) => l.logType === 'feeding' && new Date(l.loggedAt) >= today
  );
  const todayDiapers = logs.filter((l) => l.logType === 'diaper' && new Date(l.loggedAt) >= today);

  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/baby-logs')}
      className="h-auto flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left active:bg-muted"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Baby</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      {lastFeed ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Milk className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">
              {lastFeed.feedingType === 'bottle'
                ? `${lastFeed.feedingMl ?? '?'}ml`
                : `${lastFeed.breastSide ?? 'breast'}`}
            </span>
            <span className="text-muted-foreground">{formatRelativeTime(lastFeed.loggedAt)}</span>
          </div>
          {lastDiaper && (
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                {lastDiaper.diaperPoop
                  ? `Poop (${lastDiaper.diaperPoop})`
                  : `Wet ${lastDiaper.diaperWetPct ?? ''}%`}
              </span>
              <span className="text-muted-foreground">
                {formatRelativeTime(lastDiaper.loggedAt)}
              </span>
            </div>
          )}
          <div className="mt-0.5 text-xs text-muted-foreground">
            Today: {todayFeedings.length} feeds, {todayDiapers.length} diapers
          </div>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No logs yet</span>
      )}
    </Button>
  );
}
