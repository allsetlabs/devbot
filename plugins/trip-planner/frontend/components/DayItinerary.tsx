import { useState } from 'react';
import type { TripDay, TripActivity, TripActivityCategory } from '../types';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
} from '@allsetlabs/forge/components/ui/drawer';
import {
  Plus,
  MapPin,
  Clock,
  Plane,
  Utensils,
  Camera,
  Hotel,
  ShoppingBag,
  MoreHorizontal,
  Trash2,
  GripVertical,
  ExternalLink,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORIES: Record<TripActivityCategory, { icon: typeof Plane; label: string; color: string }> = {
  transport: { icon: Plane, label: 'Transport', color: 'text-blue-500' },
  food: { icon: Utensils, label: 'Food', color: 'text-orange-500' },
  activity: { icon: Camera, label: 'Activity', color: 'text-purple-500' },
  lodging: { icon: Hotel, label: 'Lodging', color: 'text-green-500' },
  shopping: { icon: ShoppingBag, label: 'Shopping', color: 'text-pink-500' },
  other: { icon: MoreHorizontal, label: 'Other', color: 'text-zinc-500' },
};

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Activity card
// ---------------------------------------------------------------------------

function ActivityCard({
  activity,
  onDelete,
  currency,
}: {
  activity: TripActivity;
  onDelete: () => void;
  currency: string;
}) {
  const cat = CATEGORIES[activity.category];
  const Icon = cat.icon;
  const mapsUrl = activity.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location)}`
    : null;

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border/50 bg-card p-3 transition-colors md:hover:border-border">
      <div className="mt-0.5 flex flex-col items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground/40" />
        <div className={`rounded-md bg-muted p-1.5 ${cat.color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-medium leading-tight">{activity.title}</h4>
            {activity.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {activity.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {activity.time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.time}
            </span>
          )}
          {activity.duration && <span>{activity.duration}</span>}
          {activity.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {activity.location}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="ml-0.5 md:hover:text-primary"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </span>
          )}
          {activity.cost != null && activity.cost > 0 && (
            <span className="font-medium">
              {activity.cost.toLocaleString()} {currency}
            </span>
          )}
          {activity.booked && (
            <span className="rounded bg-green-500/10 px-1 text-green-600 dark:text-green-400">
              Booked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add activity drawer
// ---------------------------------------------------------------------------

function AddActivityDrawer({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (activity: TripActivity) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<TripActivityCategory>('activity');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      id: generateId(),
      title: title.trim(),
      description: description.trim(),
      time: time.trim(),
      duration: duration.trim(),
      location: location.trim(),
      category,
      cost: cost ? parseFloat(cost) : undefined,
      notes: notes.trim() || undefined,
      booked: false,
    });
    onOpenChange(false);
    setTitle('');
    setDescription('');
    setTime('');
    setDuration('');
    setLocation('');
    setCategory('activity');
    setCost('');
    setNotes('');
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Add Activity</DrawerTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <DrawerBody>
          <div className="flex flex-col gap-3 pb-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(CATEGORIES) as [TripActivityCategory, typeof CATEGORIES[TripActivityCategory]][]).map(
                  ([key, cfg]) => {
                    const CatIcon = cfg.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCategory(key)}
                        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all ${
                          category === key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground md:hover:border-primary/40'
                        }`}
                      >
                        <CatIcon className="h-3 w-3" />
                        {cfg.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                placeholder="Visit the Colosseum"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                placeholder="Guided tour of the ancient amphitheater..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Time</label>
                <Input placeholder="09:00" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Duration
                </label>
                <Input
                  placeholder="2 hours"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Location
              </label>
              <Input
                placeholder="Piazza del Colosseo, Rome"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Cost (optional)
              </label>
              <Input
                type="number"
                placeholder="16"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                placeholder="Book tickets online in advance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleAdd} disabled={!title.trim()}>
              Add Activity
            </Button>
          </div>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Day section
// ---------------------------------------------------------------------------

function DaySection({
  day,
  dayIndex,
  currency,
  onAddActivity,
  onDeleteActivity,
  onDeleteDay,
}: {
  day: TripDay;
  dayIndex: number;
  currency: string;
  onAddActivity: (dayId: string, activity: TripActivity) => void;
  onDeleteActivity: (dayId: string, activityId: string) => void;
  onDeleteDay: (dayId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const dayCost = day.activities.reduce((sum, a) => sum + (a.cost ?? 0), 0);

  const dateLabel = day.date
    ? new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <div className="rounded-xl border border-border/60 bg-card/50">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <h3 className="text-sm font-semibold">
              Day {dayIndex + 1}
              {day.title && ` — ${day.title}`}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {dateLabel}
              {day.activities.length > 0 && ` · ${day.activities.length} activities`}
              {dayCost > 0 && ` · ${dayCost.toLocaleString()} ${currency}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setAddOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteDay(day.id);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {day.activities.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No activities yet.{' '}
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="text-primary md:hover:underline"
              >
                Add one
              </button>
            </p>
          ) : (
            day.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                currency={currency}
                onDelete={() => onDeleteActivity(day.id, activity.id)}
              />
            ))
          )}
          {day.notes && (
            <p className="mt-1 text-xs italic text-muted-foreground">{day.notes}</p>
          )}
        </div>
      )}

      <AddActivityDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(activity) => onAddActivity(day.id, activity)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DayItineraryProps {
  days: TripDay[];
  startDate: string;
  endDate: string;
  currency: string;
  onChange: (days: TripDay[]) => void;
}

export function DayItinerary({ days, startDate, endDate, currency, onChange }: DayItineraryProps) {
  const handleAddDay = () => {
    // Compute next date based on existing days
    let nextDate = '';
    if (days.length === 0 && startDate) {
      nextDate = startDate;
    } else if (days.length > 0) {
      const lastDate = days[days.length - 1].date;
      if (lastDate) {
        const d = new Date(lastDate + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().split('T')[0];
      }
    }

    const newDay: TripDay = {
      id: generateId(),
      date: nextDate,
      title: '',
      activities: [],
    };
    onChange([...days, newDay]);
  };

  const handleAutoGenerate = () => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const newDays: TripDay[] = [];
    const current = new Date(start);
    let dayNum = 1;

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      // Don't recreate days that already exist for this date
      const existing = days.find((d) => d.date === dateStr);
      if (existing) {
        newDays.push(existing);
      } else {
        newDays.push({
          id: generateId(),
          date: dateStr,
          title: dayNum === 1 ? 'Arrival' : current.getTime() === end.getTime() ? 'Departure' : '',
          activities: [],
        });
      }
      current.setDate(current.getDate() + 1);
      dayNum++;
    }

    onChange(newDays);
  };

  const handleAddActivity = (dayId: string, activity: TripActivity) => {
    onChange(
      days.map((d) => (d.id === dayId ? { ...d, activities: [...d.activities, activity] } : d))
    );
  };

  const handleDeleteActivity = (dayId: string, activityId: string) => {
    onChange(
      days.map((d) =>
        d.id === dayId
          ? { ...d, activities: d.activities.filter((a) => a.id !== activityId) }
          : d
      )
    );
  };

  const handleDeleteDay = (dayId: string) => {
    onChange(days.filter((d) => d.id !== dayId));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Itinerary ({days.length} day{days.length !== 1 ? 's' : ''})
        </h2>
        <div className="flex items-center gap-2">
          {startDate && endDate && days.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleAutoGenerate}>
              Auto-generate days
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleAddDay}>
            <Plus className="mr-1 h-3 w-3" />
            Add Day
          </Button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8">
          <p className="text-sm text-muted-foreground">No days planned yet</p>
          <div className="flex gap-2">
            {startDate && endDate && (
              <Button variant="outline" size="sm" onClick={handleAutoGenerate}>
                Generate from dates
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleAddDay}>
              <Plus className="mr-1 h-3 w-3" />
              Add first day
            </Button>
          </div>
        </div>
      ) : (
        days.map((day, i) => (
          <DaySection
            key={day.id}
            day={day}
            dayIndex={i}
            currency={currency}
            onAddActivity={handleAddActivity}
            onDeleteActivity={handleDeleteActivity}
            onDeleteDay={handleDeleteDay}
          />
        ))
      )}
    </div>
  );
}
