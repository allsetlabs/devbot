import { useState, useEffect, useCallback } from 'react';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { toast } from 'sonner';
import { HeaderSlot } from '../components/HeaderSlot';
import {
  smartSchedulerApi,
  type GlobalAnalytics,
} from '../lib/smartSchedulerApi';
import {
  RefreshCw,
  DollarSign,
  Activity,
  Zap,
  CheckCircle2,
  Lightbulb,
  Loader2,
  BarChart3,
  PiggyBank,
} from 'lucide-react';
import { SmartSchedulerCostTable } from '../components/SmartSchedulerCostTable';
import { SmartSchedulerBudget } from '../components/SmartSchedulerBudget';
import { SmartSchedulerPredictions } from '../components/SmartSchedulerPredictions';

// ─── Helpers ────────────────────────────────────────────────────────────

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(2)}`;
}

type TabId = 'overview' | 'costs' | 'budget' | 'predictions';

// ─── Page ───────────────────────────────────────────────────────────────

export function SmartSchedulerPage() {
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsData, insightsData] = await Promise.all([
        smartSchedulerApi.getGlobalAnalytics(),
        smartSchedulerApi.getInsights(),
      ]);
      setAnalytics(analyticsData);
      setInsights(insightsData.insights);
    } catch (err) {
      toast.error('Failed to load analytics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'costs', label: 'Costs', icon: DollarSign },
    { id: 'budget', label: 'Budget', icon: PiggyBank },
    { id: 'predictions', label: 'Optimize', icon: Lightbulb },
  ];

  return (
    <div className="space-y-4 pb-20">
      <HeaderSlot>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </HeaderSlot>

      {/* Stat Cards */}
      {analytics && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
            label="Total Cost"
            value={formatCost(analytics.total_cost)}
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            label="Total Runs"
            value={String(analytics.total_runs)}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            label="Success Rate"
            value={`${analytics.avg_success_rate}%`}
          />
          <StatCard
            icon={<Zap className="h-4 w-4 text-amber-500" />}
            label="Active"
            value={`${analytics.active_schedulers} / ${analytics.total_schedulers}`}
          />
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            {insights.map((insight, i) => (
              <p key={i} className="text-sm text-muted-foreground">{insight}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      {loading && !analytics ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : analytics ? (
        <>
          {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
          {activeTab === 'costs' && <SmartSchedulerCostTable analytics={analytics} />}
          {activeTab === 'budget' && <SmartSchedulerBudget budget={analytics.budget} onRefresh={refresh} />}
          {activeTab === 'predictions' && <SmartSchedulerPredictions predictions={analytics.predictions} />}
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No analytics data yet. Run some scheduler tasks to start tracking.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-2.5">
        {icon}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────

function OverviewTab({ analytics }: { analytics: GlobalAnalytics }) {
  return (
    <div className="space-y-4">
      {/* Cost by Model */}
      {Object.keys(analytics.cost_by_model).length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-sm font-medium">Cost by Model</h3>
            {Object.entries(analytics.cost_by_model)
              .sort(([, a], [, b]) => b - a)
              .map(([model, cost]) => {
                const total = analytics.total_cost || 1;
                const pct = (cost / total) * 100;
                return (
                  <div key={model} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{model}</span>
                      <span className="text-muted-foreground">{formatCost(cost)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Busiest Hours */}
      {analytics.busiest_hours.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-sm font-medium">Busiest Hours</h3>
            <div className="grid grid-cols-4 gap-2">
              {analytics.busiest_hours.slice(0, 8).map((h) => (
                <div key={h.hour} className="text-center p-1.5 rounded bg-muted/50">
                  <p className="text-sm font-medium">{String(h.hour).padStart(2, '0')}:00</p>
                  <p className="text-xs text-muted-foreground">{h.runs} runs</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Daily Cost */}
      {analytics.cost_by_day.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h3 className="text-sm font-medium">Daily Cost (Last 30d)</h3>
            <div className="space-y-1">
              {analytics.cost_by_day.slice(-7).map((day) => (
                <div key={day.date} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{day.date.slice(5)}</span>
                  <span>{formatCost(day.cost)} · {day.runs} runs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
