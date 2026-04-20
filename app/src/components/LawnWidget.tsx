import { useNavigate } from 'react-router-dom';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { Leaf, ChevronRight, CalendarDays } from 'lucide-react';
import type { LawnPlan, LawnProfile } from '@devbot/plugin-lawn-care/frontend/types';

function getNextApplication(plans: LawnPlan[]): { date: string; name: string } | null {
  const completedPlan = plans.find((p) => p.status === 'completed' && p.planData);
  if (!completedPlan?.planData) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = completedPlan.planData.applications
    .filter((app) => new Date(app.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (upcoming.length === 0) return null;
  return { date: upcoming[0].date, name: upcoming[0].name };
}

export function LawnWidget({ profiles, plans }: { profiles: LawnProfile[]; plans: LawnPlan[] }) {
  const navigate = useNavigate();
  const next = getNextApplication(plans);
  const profile = profiles[0];

  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/lawn-care')}
      className="h-auto flex-col items-start gap-2 rounded-xl border border-border bg-card p-4 text-left active:bg-muted"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Lawn Care</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
      {next ? (
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">{next.name}</span>
          </div>
          <span className="text-muted-foreground">
            {new Date(next.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">
          {profile ? 'No upcoming applications' : 'No profile set up'}
        </span>
      )}
    </Button>
  );
}
