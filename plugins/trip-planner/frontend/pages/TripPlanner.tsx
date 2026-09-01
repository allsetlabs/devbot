import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TripRecord, TripStatus } from '../types';
import { tripPlannerApi } from '../api';
import type { TripStats } from '../api';
import { TripCard } from '../components/TripCard';
import { CreateTripDrawer } from '../components/CreateTripDrawer';
import { HeaderSlot } from '@devbot/app/components/HeaderSlot';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import {
  Plus,
  Search,
  Loader2,
  Map,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FILTERS: { value: TripStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'planning', label: '📝 Planning' },
  { value: 'booked', label: '✅ Booked' },
  { value: 'in-progress', label: '🧳 Active' },
  { value: 'completed', label: '🏁 Done' },
];

export function TripPlanner() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [stats, setStats] = useState<TripStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const params: Record<string, string> = { sort: 'startDate', order: 'desc' };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      const [tripData, statsData] = await Promise.all([
        tripPlannerApi.list(params),
        tripPlannerApi.stats(),
      ]);
      setTrips(tripData);
      setStats(statsData);
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const handleCreate = async (data: Partial<TripRecord>) => {
    await tripPlannerApi.create(data);
    toast.success('Trip created!');
    await loadTrips();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await tripPlannerApi.importTrip(data);
        toast.success('Trip imported!');
        await loadTrips();
      } catch {
        toast.error('Failed to import trip file');
      }
    };
    input.click();
  };

  return (
    <div className="flex h-full flex-col">
      <HeaderSlot>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleImport}>
            <Upload className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLoading(true); void loadTrips(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New Trip
          </Button>
        </div>
      </HeaderSlot>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-2xl p-4">
          {/* Stats row */}
          {stats && stats.totalTrips > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label="Trips" value={String(stats.totalTrips)} />
              <StatCard label="Days Planned" value={String(stats.totalDays)} />
              <StatCard label="Activities" value={String(stats.totalActivities)} />
              <StatCard
                label="Total Spend"
                value={stats.totalExpenses > 0 ? `$${stats.totalExpenses.toLocaleString()}` : '—'}
              />
            </div>
          )}

          {/* Search + filter */}
          <div className="mb-3 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search trips…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition-all ${
                    statusFilter === f.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border text-muted-foreground md:hover:border-primary/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trip list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 py-12">
              <Map className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'No trips match your filters' : 'No trips yet'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  {search || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Start planning your next adventure'}
                </p>
              </div>
              {!search && statusFilter === 'all' && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Plan a Trip
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() => navigate(`/plugins/trip-planner/${trip.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateTripDrawer open={createOpen} onOpenChange={setCreateOpen} onSubmit={handleCreate} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-center">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
