import type { TripRecord, TripStatus } from '../types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@allsetlabs/forge/components/ui/card';
import { MapPin, Calendar, Users, DollarSign } from 'lucide-react';

const STATUS_CONFIG: Record<TripStatus, { label: string; color: string }> = {
  planning: { label: 'Planning', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  booked: { label: 'Booked', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  'in-progress': { label: 'In Progress', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  completed: { label: 'Completed', color: 'bg-zinc-500/10 text-zinc-500' },
};

function formatDateRange(start: string, end: string): string {
  if (!start) return 'No dates set';
  const s = new Date(start + 'T00:00:00');
  const e = end ? new Date(end + 'T00:00:00') : null;
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = s.toLocaleDateString('en-US', opts);
  if (!e) return startStr;
  const endOpts: Intl.DateTimeFormatOptions =
    s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()
      ? { day: 'numeric' }
      : opts;
  return `${startStr} – ${e.toLocaleDateString('en-US', endOpts)}`;
}

function getDayCount(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

interface TripCardProps {
  trip: TripRecord;
  onClick: () => void;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const status = STATUS_CONFIG[trip.status];
  const totalExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const dayCount = getDayCount(trip.startDate, trip.endDate);
  const activityCount = trip.days.reduce((sum, d) => sum + d.activities.length, 0);

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer transition-all md:hover:-translate-y-0.5 md:hover:border-primary/60 md:hover:shadow-md active:scale-[0.98]"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{trip.coverEmoji}</span>
            <div>
              <CardTitle className="text-base">{trip.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {trip.destination}
              </CardDescription>
            </div>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {trip.description && (
          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{trip.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {trip.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateRange(trip.startDate, trip.endDate)}
              {dayCount > 0 && ` (${dayCount}d)`}
            </span>
          )}
          {trip.travelers.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {trip.travelers.length}
            </span>
          )}
          {(trip.budget > 0 || totalExpenses > 0) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {totalExpenses > 0
                ? `${totalExpenses.toLocaleString()} / ${trip.budget.toLocaleString()}`
                : trip.budget.toLocaleString()}
              {' '}{trip.currency}
            </span>
          )}
          {activityCount > 0 && (
            <span className="text-muted-foreground/60">
              {activityCount} activit{activityCount === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
        {trip.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {trip.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {trip.tags.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{trip.tags.length - 4}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
