import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Weight, Ruler, CircleDot } from 'lucide-react';
import { Button } from '@subbiah/reusable/components/ui/button';
import { babyLogsApi } from '../api';
import { PercentileChart } from '../components/PercentileChart';
import { estimatePercentile } from '../lib/who-growth-data';
import type { BabyDataPoint } from '../components/PercentileChart';
import type { BabyLog, BabyProfile, Gender } from '../types';
import type { GrowthMetric } from '../lib/who-growth-data';

type Tab = 'weight' | 'height' | 'head';

const TAB_CONFIG: {
  key: Tab;
  label: string;
  icon: typeof Weight;
  metric: GrowthMetric;
  unit: string;
  chartLabel: string;
  field: keyof BabyLog;
  logType: string;
}[] = [
  {
    key: 'weight',
    label: 'Weight',
    icon: Weight,
    metric: 'weight',
    unit: 'kg',
    chartLabel: 'Weight for Age',
    field: 'weightKg',
    logType: 'weight',
  },
  {
    key: 'height',
    label: 'Height',
    icon: Ruler,
    metric: 'height',
    unit: 'cm',
    chartLabel: 'Height for Age',
    field: 'heightCm',
    logType: 'height',
  },
  {
    key: 'head',
    label: 'Head',
    icon: CircleDot,
    metric: 'headCircumference',
    unit: 'cm',
    chartLabel: 'Head Circumference for Age',
    field: 'headCircumferenceCm',
    logType: 'head_circumference',
  },
];

function computeBabyData(
  logs: BabyLog[],
  field: keyof BabyLog,
  logType: string,
  dob: string
): BabyDataPoint[] {
  const dobMs = new Date(dob).getTime();

  return logs
    .filter((l) => l.logType === logType && l[field] !== null)
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map((l) => {
      const logMs = new Date(l.loggedAt).getTime();
      const ageMonths = (logMs - dobMs) / (1000 * 60 * 60 * 24 * 30.44);
      const d = new Date(l.loggedAt);
      return {
        ageMonths: Math.max(0, ageMonths),
        value: l[field] as number,
        date: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
      };
    });
}

function PercentileSummaryRow({
  label,
  value,
  unit,
  percentile,
}: {
  label: string;
  value: number;
  unit: string;
  percentile: number;
}) {
  return (
    <div className="border-border flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-foreground text-sm font-medium">
          {value} {unit}
        </span>
        <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-bold">
          {percentile}th
        </span>
      </div>
    </div>
  );
}

export function GrowthCharts() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('weight');

  const logsQuery = useQuery({
    queryKey: ['baby-logs-growth'],
    queryFn: () => babyLogsApi.listBabyLogs(undefined, 500, 0),
  });

  const profilesQuery = useQuery({
    queryKey: ['baby-profiles'],
    queryFn: () => babyLogsApi.listBabyProfiles(),
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const profiles: BabyProfile[] = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const profile = profiles[0];
  const loading = logsQuery.isLoading || profilesQuery.isLoading;
  const gender: Gender = profile?.gender ?? 'male';
  const dob = profile?.dateOfBirth;

  const tabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  const babyData = useMemo(() => {
    if (!dob) return [];
    return computeBabyData(logs, tabConfig.field, tabConfig.logType, dob);
  }, [logs, tabConfig.field, tabConfig.logType, dob]);

  const latest = babyData.length > 0 ? babyData[babyData.length - 1] : null;
  const latestPercentile = latest
    ? estimatePercentile(gender, tabConfig.metric, latest.ageMonths, latest.value)
    : null;

  const summaries = useMemo(() => {
    if (!dob) return [];
    return TAB_CONFIG.map((tab) => {
      const data = computeBabyData(logs, tab.field, tab.logType, dob);
      const last = data.length > 0 ? data[data.length - 1] : null;
      if (!last) return null;
      return {
        label: tab.label,
        value: last.value,
        unit: tab.unit,
        percentile: estimatePercentile(gender, tab.metric, last.ageMonths, last.value),
      };
    }).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [logs, dob, gender]);

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <header className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/baby-logs/analytics')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <TrendingUp className="text-primary h-5 w-5" />
        <h1 className="text-foreground text-xl font-bold">Growth Charts</h1>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      )}

      {!loading && !profile && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <TrendingUp className="text-muted-foreground/40 h-10 w-10" />
          <p className="text-muted-foreground text-sm">
            Create a baby profile first to see growth charts.
          </p>
          <Button variant="outline" onClick={() => navigate('/baby-logs')}>
            Go to Baby Logs
          </Button>
        </div>
      )}

      {!loading && profile && (
        <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-8">
          {/* Profile summary */}
          <div className="text-center">
            <p className="text-foreground text-sm font-medium">{profile.firstName}</p>
            <p className="text-muted-foreground text-xs">
              {gender === 'male' ? 'Boy' : 'Girl'} · Born{' '}
              {new Date(profile.dateOfBirth).toLocaleDateString()}
              {latest &&
                latestPercentile !== null &&
                ` · Latest: ${latest.value} ${tabConfig.unit} (${latestPercentile}th)`}
            </p>
          </div>

          {/* Tabs */}
          <div className="border-border bg-muted flex gap-1 rounded-lg border p-1">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Chart */}
          <PercentileChart
            gender={gender}
            metric={tabConfig.metric}
            babyData={babyData}
            unit={tabConfig.unit}
            label={tabConfig.chartLabel}
          />

          {/* Latest measurements summary */}
          {summaries.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-foreground text-sm font-semibold">Latest Measurements</h3>
              {summaries.map((s) => (
                <PercentileSummaryRow key={s.label} {...s} />
              ))}
            </div>
          )}

          {babyData.length === 0 && (
            <div className="border-border bg-card rounded-xl border p-6 text-center">
              <p className="text-muted-foreground text-sm">
                No {tabConfig.label.toLowerCase()} measurements yet. Add them from the Baby Logs
                page.
              </p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
