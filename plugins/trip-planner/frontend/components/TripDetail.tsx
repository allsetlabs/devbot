import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripRecord, TripStatus } from '../types';
import { tripPlannerApi } from '../api';
import { DayItinerary } from './DayItinerary';
import { ExpenseTracker } from './ExpenseTracker';
import { CreateTripDrawer } from './CreateTripDrawer';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Textarea } from '@allsetlabs/forge/components/ui/textarea';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Pencil,
  Download,
  Trash2,
  Loader2,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'planning', label: '📝 Planning' },
  { value: 'booked', label: '✅ Booked' },
  { value: 'in-progress', label: '🧳 In Progress' },
  { value: 'completed', label: '🏁 Completed' },
];

function formatDateRange(start: string, end: string): string {
  if (!start) return 'No dates set';
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts);
  if (!end) return s;
  const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}

interface TripDetailProps {
  tripId: string;
}

export function TripDetail({ tripId }: TripDetailProps) {
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'notes'>('itinerary');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);

  const loadTrip = useCallback(async () => {
    try {
      const data = await tripPlannerApi.get(tripId);
      setTrip(data);
      setNotes(data.notes || '');
    } catch {
      toast.error('Failed to load trip');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  const saveTrip = useCallback(
    async (updates: Partial<TripRecord>) => {
      if (!trip) return;
      setSaving(true);
      try {
        const updated = await tripPlannerApi.update(trip.id, {
          ...trip,
          ...updates,
          updated_by: 'user',
        });
        setTrip(updated);
        setDirty(false);
        toast.success('Trip saved');
      } catch {
        toast.error('Failed to save trip');
      } finally {
        setSaving(false);
      }
    },
    [trip]
  );

  const handleDelete = async () => {
    if (!trip) return;
    try {
      await tripPlannerApi.delete(trip.id);
      toast.success('Trip deleted');
      navigate('/plugins/trip-planner');
    } catch {
      toast.error('Failed to delete trip');
    }
  };

  const handleExport = async () => {
    if (!trip) return;
    try {
      await tripPlannerApi.exportTrip(trip.id);
      toast.success('Trip exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleStatusChange = (status: TripStatus) => {
    if (!trip) return;
    void saveTrip({ status });
  };

  const handleEditSubmit = async (data: Partial<TripRecord>) => {
    await saveTrip(data);
    await loadTrip();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">Trip not found</p>
        <Button variant="outline" onClick={() => navigate('/plugins/trip-planner')}>
          Back to trips
        </Button>
      </div>
    );
  }

  const tabs = [
    { key: 'itinerary', label: `Itinerary (${trip.days.length})` },
    { key: 'expenses', label: `Expenses (${trip.expenses.length})` },
    { key: 'notes', label: 'Notes' },
  ] as const;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/60 bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => navigate('/plugins/trip-planner')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-2xl">{trip.coverEmoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-base font-semibold">{trip.name}</h1>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {trip.destination}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {/* Trip meta */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {trip.startDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateRange(trip.startDate, trip.endDate)}
            </span>
          )}
          {trip.travelers.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {trip.travelers.join(', ')}
            </span>
          )}
        </div>

        {/* Status selector */}
        <div className="mt-2 flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusChange(opt.value)}
              className={`rounded-full border px-2 py-0.5 text-[11px] transition-all ${
                trip.status === opt.value
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground md:hover:border-primary/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 bg-background px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground md:hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'itinerary' && (
          <DayItinerary
            days={trip.days}
            startDate={trip.startDate}
            endDate={trip.endDate}
            currency={trip.currency}
            onChange={(days) => {
              setTrip({ ...trip, days });
              setDirty(true);
            }}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseTracker
            expenses={trip.expenses}
            budget={trip.budget}
            currency={trip.currency}
            onChange={(expenses) => {
              setTrip({ ...trip, expenses });
              setDirty(true);
            }}
          />
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col gap-3">
            <Textarea
              placeholder="Trip notes, packing list, important info..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              rows={12}
              className="resize-none"
            />
          </div>
        )}

        {/* Save bar */}
        {dirty && (
          <div className="sticky bottom-4 mt-4 flex justify-center">
            <Button
              onClick={() => saveTrip({ days: trip.days, expenses: trip.expenses, notes })}
              disabled={saving}
              className="shadow-lg"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <CreateTripDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleEditSubmit}
        initial={trip}
      />
    </div>
  );
}
