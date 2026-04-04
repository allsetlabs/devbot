import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Milk, TrendingUp, Clock, Weight, Ruler, Users, LineChart } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { babyLogsApi } from '../api';
import { toDateKey, roundToNearest5 } from '@devbot/app/lib/format';
import type { BabyLog } from '../types';

// ─── Data computation ─────────────────────────────────────────────────────────

interface DayStat {
  dateKey: string;
  label: string;
  feedingCount: number;
  bottleCount: number;
  breastCount: number;
  totalMl: number;
  avgMlPerFeed: number;
  totalBreastMin: number;
  avgBreastDurationMin: number;
  avgGapMin: number;
  avgDurationMin: number;
  wetCount: number;
  avgWetPct: number;
  poopCount: number;
  smallPoopCount: number;
  largePoopCount: number;
}

function shortDayLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  return String(d.getDate());
}

function computeDayStats(logs: BabyLog[]): DayStat[] {
  const dayMap = new Map<string, BabyLog[]>();
  for (const log of logs) {
    const key = toDateKey(log.loggedAt);
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(log);
  }
  const stats: DayStat[] = [];
  for (const [dateKey, dayLogs] of dayMap) {
    const feedings = dayLogs.filter((l) => l.logType === 'feeding');
    const bottleFeedings = feedings.filter((l) => l.feedingType !== 'breast');
    const breastFeedings = feedings.filter((l) => l.feedingType === 'breast');
    const wets = dayLogs.filter((l) => l.logType === 'diaper' && l.diaperWetPct !== null);
    const poops = dayLogs.filter((l) => l.logType === 'diaper' && l.diaperPoop !== null);
    const mlFeedings = bottleFeedings.filter((l) => l.feedingMl !== null);
    const durFeedings = feedings.filter((l) => l.feedingDurationMin !== null);
    const breastDurFeedings = breastFeedings.filter((l) => l.feedingDurationMin !== null);
    const sortedFeedings = [...feedings].sort(
      (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
    );
    let dayAvgGapMin = 0;
    if (sortedFeedings.length >= 2) {
      let totalGap = 0;
      let gapCount = 0;
      for (let i = 1; i < sortedFeedings.length; i++) {
        const gap =
          (new Date(sortedFeedings[i].loggedAt).getTime() -
            new Date(sortedFeedings[i - 1].loggedAt).getTime()) /
          60000;
        totalGap += gap;
        gapCount++;
      }
      dayAvgGapMin = gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
    }
    const totalBreastMin = breastDurFeedings.reduce((s, l) => s + (l.feedingDurationMin ?? 0), 0);
    stats.push({
      dateKey,
      label: shortDayLabel(dateKey),
      feedingCount: feedings.length,
      bottleCount: bottleFeedings.length,
      breastCount: breastFeedings.length,
      totalMl: mlFeedings.reduce((s, l) => s + (l.feedingMl ?? 0), 0),
      avgMlPerFeed:
        mlFeedings.length > 0
          ? roundToNearest5(
              mlFeedings.reduce((s, l) => s + (l.feedingMl ?? 0), 0) / mlFeedings.length
            )
          : 0,
      totalBreastMin,
      avgBreastDurationMin:
        breastDurFeedings.length > 0 ? Math.round(totalBreastMin / breastDurFeedings.length) : 0,
      avgGapMin: dayAvgGapMin,
      avgDurationMin:
        durFeedings.length > 0
          ? Math.round(
              durFeedings.reduce((s, l) => s + (l.feedingDurationMin ?? 0), 0) / durFeedings.length
            )
          : 0,
      wetCount: wets.length,
      avgWetPct:
        wets.length > 0
          ? Math.round(wets.reduce((s, l) => s + (l.diaperWetPct ?? 0), 0) / wets.length)
          : 0,
      poopCount: poops.length,
      smallPoopCount: poops.filter((l) => l.diaperPoop === 'small').length,
      largePoopCount: poops.filter((l) => l.diaperPoop === 'large').length,
    });
  }
  return stats.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

/** Fill last 14 days (including today) with avg ml/feed, trimming leading zero days */
function last14DaysAvgMlPerFeed(dayStats: DayStat[]): { label: string; value: number }[] {
  const statMap = new Map(dayStats.map((d) => [d.dateKey, d]));
  const today = new Date();
  const all = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { label: String(d.getDate()), value: statMap.get(key)?.avgMlPerFeed ?? 0 };
  });
  const firstNonZero = all.findIndex((d) => d.value > 0);
  return firstNonZero === -1 ? all : all.slice(firstNonZero);
}

/** Avg gap between consecutive feedings in minutes */
function avgFeedingGapMin(logs: BabyLog[]): number {
  const feedings = logs
    .filter((l) => l.logType === 'feeding')
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  if (feedings.length < 2) return 0;
  let totalGap = 0;
  let count = 0;
  for (let i = 1; i < feedings.length; i++) {
    const gap =
      (new Date(feedings[i].loggedAt).getTime() - new Date(feedings[i - 1].loggedAt).getTime()) /
      60000;
    if (gap < 720) {
      // Only count gaps < 12h (ignore overnight gaps for same-session)
      totalGap += gap;
      count++;
    }
  }
  return count > 0 ? Math.round(totalGap / count) : 0;
}

// ─── Feeds by person (total + below-avg) last 5 weeks ───────────────────────

interface WeekData {
  label: string;
  total: number;
  belowAvg: number;
}

interface FeedsByPerson {
  name: string;
  weeks: WeekData[];
}

function computeFeedsByPerson(logs: BabyLog[]): FeedsByPerson[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0=Sun
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  // Build week boundaries for last 5 weeks
  const MAX_WEEKS = 5;
  const weekBounds: { start: number; end: number; label: string }[] = [];
  for (let i = 0; i < MAX_WEEKS; i++) {
    const start = new Date(thisWeekStart);
    start.setDate(thisWeekStart.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const monthDay = `${start.toLocaleString('en', { month: 'short' })} ${start.getDate()}`;
    weekBounds.unshift({ start: start.getTime(), end: end.getTime(), label: monthDay });
  }

  const earliestMs = weekBounds[0].start;

  // All bottle feeds with ml (for daily average)
  const allBottleFeeds = logs.filter(
    (l) => l.logType === 'feeding' && l.feedingType !== 'breast' && l.feedingMl !== null
  );

  // Daily average ml per feed (across all people)
  const dayFeeds = new Map<string, number[]>();
  for (const log of allBottleFeeds) {
    const key = toDateKey(log.loggedAt);
    if (!dayFeeds.has(key)) dayFeeds.set(key, []);
    dayFeeds.get(key)!.push(log.feedingMl!);
  }
  const dailyAvg = new Map<string, number>();
  for (const [key, mls] of dayFeeds) {
    dailyAvg.set(key, roundToNearest5(mls.reduce((a, b) => a + b, 0) / mls.length));
  }

  // Count total + below-avg per person per week
  const personWeeks = new Map<string, Map<number, { total: number; belowAvg: number }>>();

  for (const log of logs) {
    if (log.logType !== 'feeding' || !log.fedBy || log.feedingType === 'breast') continue;
    const t = new Date(log.loggedAt).getTime();
    if (t < earliestMs) continue;

    const weekIdx = weekBounds.findIndex((w) => t >= w.start && t < w.end);
    if (weekIdx === -1) continue;

    const isBelowAvg =
      log.feedingMl !== null && log.feedingMl < (dailyAvg.get(toDateKey(log.loggedAt)) ?? 0);

    const names = log.fedBy
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    for (const name of names) {
      if (!personWeeks.has(name)) personWeeks.set(name, new Map());
      const weeks = personWeeks.get(name)!;
      if (!weeks.has(weekIdx)) weeks.set(weekIdx, { total: 0, belowAvg: 0 });
      const entry = weeks.get(weekIdx)!;
      entry.total++;
      if (isBelowAvg) entry.belowAvg++;
    }
  }

  // Only include weeks that have data from any person
  const weeksWithData = new Set<number>();
  for (const weeks of personWeeks.values()) {
    for (const idx of weeks.keys()) weeksWithData.add(idx);
  }
  const activeWeekIndices = Array.from(weeksWithData).sort((a, b) => a - b);
  if (activeWeekIndices.length === 0) return [];

  return Array.from(personWeeks.entries())
    .map(([name, weeks]) => ({
      name,
      weeks: activeWeekIndices.map((idx) => ({
        label: weekBounds[idx].label,
        total: weeks.get(idx)?.total ?? 0,
        belowAvg: weeks.get(idx)?.belowAvg ?? 0,
      })),
    }))
    .sort(
      (a, b) => b.weeks.reduce((s, w) => s + w.total, 0) - a.weeks.reduce((s, w) => s + w.total, 0)
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-xl border p-3">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {icon}
        {label}
      </div>
      <div className="text-foreground text-xl font-bold">{value}</div>
      {sub && <div className="text-muted-foreground text-xs">{sub}</div>}
    </div>
  );
}

function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

interface BarChartProps {
  data: { label: string; value: number }[];
  unit?: string;
  colorClass?: string;
  colorStyle?: string;
  formatValue?: (value: number) => string;
}

function BarChart({
  data,
  unit = '',
  colorClass = 'bg-primary',
  colorStyle,
  formatValue,
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-20 items-end gap-0.5">
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
          <span
            className={`text-muted-foreground text-[8px] leading-none ${d.value === 0 ? 'invisible' : ''}`}
          >
            {formatValue ? formatValue(d.value) : `${d.value}${unit}`}
          </span>
          <div
            className={`w-full rounded-t-sm ${colorStyle ? '' : colorClass}`}
            style={{
              height: `${Math.max((d.value / max) * 56, d.value > 0 ? 3 : 0)}px`,
              ...(colorStyle ? { backgroundColor: colorStyle } : {}),
            }}
          />
          <span className="text-muted-foreground text-[8px] leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface ChartSectionProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function ChartSection({ title, subtitle, action, children }: ChartSectionProps) {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-foreground text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Comparison Chart ─────────────────────────────────────────────────────────

interface FeedingPoint {
  minuteOfDay: number; // 0–1440
  ml: number;
}

function extractFeedingPoints(logs: BabyLog[], dateKey: string): FeedingPoint[] {
  const sorted = logs
    .filter(
      (l) =>
        l.logType === 'feeding' &&
        l.feedingType !== 'breast' &&
        l.feedingMl !== null &&
        toDateKey(l.loggedAt) === dateKey
    )
    .map((l) => {
      const d = new Date(l.loggedAt);
      return { minuteOfDay: d.getHours() * 60 + d.getMinutes(), ml: l.feedingMl! };
    })
    .sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  // Cumulative: each point = sum of all feedings up to that time
  let cumulative = 0;
  return sorted.map((p) => {
    cumulative += p.ml;
    return { minuteOfDay: p.minuteOfDay, ml: cumulative };
  });
}

interface BreastFeedingPoint {
  minuteOfDay: number;
  minutes: number;
}

function extractBreastPoints(logs: BabyLog[], dateKey: string): BreastFeedingPoint[] {
  const sorted = logs
    .filter(
      (l) =>
        l.logType === 'feeding' &&
        l.feedingType === 'breast' &&
        l.feedingDurationMin !== null &&
        toDateKey(l.loggedAt) === dateKey
    )
    .map((l) => {
      const d = new Date(l.loggedAt);
      return { minuteOfDay: d.getHours() * 60 + d.getMinutes(), minutes: l.feedingDurationMin! };
    })
    .sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  let cumulative = 0;
  return sorted.map((p) => {
    cumulative += p.minutes;
    return { minuteOfDay: p.minuteOfDay, minutes: cumulative };
  });
}

function formatHour(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const period = h >= 12 ? 'pm' : 'am';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}${period}`;
}

interface ComparisonLineChartProps {
  todayPoints: FeedingPoint[];
  yesterdayPoints: FeedingPoint[];
}

function ComparisonLineChart({ todayPoints, yesterdayPoints }: ComparisonLineChartProps) {
  const W = 320;
  const PAD = { top: 24, right: 12, bottom: 40, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = 120;
  const totalH = chartH + PAD.top + PAD.bottom;

  const allPoints = [...todayPoints, ...yesterdayPoints];
  const maxMl = Math.max(...allPoints.map((p) => p.ml), 1);

  // Round up to nice y-axis max
  const yMax = Math.ceil(maxMl / 10) * 10;

  const xPos = (min: number) => PAD.left + (min / 1440) * chartW;
  const yPos = (ml: number) => PAD.top + (1 - ml / yMax) * chartH;

  const polyline = (points: FeedingPoint[]) =>
    points.map((p) => `${xPos(p.minuteOfDay).toFixed(1)},${yPos(p.ml).toFixed(1)}`).join(' ');

  // Y-axis grid lines
  const yTicks = [0, Math.round(yMax / 2), yMax];

  // X-axis labels every 4 hours
  const xTicks = [0, 4, 8, 12, 16, 20].map((h) => h * 60);

  const todayColor = 'oklch(var(--primary))';
  const yesterdayColor = 'oklch(var(--muted-foreground))';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" style={{ height: `${totalH}px` }}>
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PAD.left}
              y1={yPos(tick)}
              x2={W - PAD.right}
              y2={yPos(tick)}
              stroke="oklch(var(--border))"
              strokeWidth="0.5"
              strokeDasharray={tick === 0 ? undefined : '2,2'}
            />
            <text
              x={PAD.left - 4}
              y={yPos(tick) + 3}
              textAnchor="end"
              fontSize="7"
              fill="oklch(var(--muted-foreground))"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xTicks.map((min) => (
          <text
            key={`x-${min}`}
            x={xPos(min)}
            y={PAD.top + chartH + 13}
            textAnchor="middle"
            fontSize="7"
            fill="oklch(var(--muted-foreground))"
          >
            {formatHour(min)}
          </text>
        ))}

        {/* Yesterday line */}
        {yesterdayPoints.length > 1 && (
          <polyline
            points={polyline(yesterdayPoints)}
            fill="none"
            stroke={yesterdayColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.7"
          />
        )}
        {yesterdayPoints.map((p, i) => (
          <g key={`y-dot-${i}`}>
            <circle
              cx={xPos(p.minuteOfDay)}
              cy={yPos(p.ml)}
              r={3}
              fill={yesterdayColor}
              opacity="0.7"
            />
            <text
              x={xPos(p.minuteOfDay)}
              y={yPos(p.ml) - 6}
              textAnchor="middle"
              fontSize="7"
              fill={yesterdayColor}
              fontWeight="600"
              opacity="0.8"
            >
              {p.ml}
            </text>
          </g>
        ))}

        {/* Today line */}
        {todayPoints.length > 1 && (
          <polyline
            points={polyline(todayPoints)}
            fill="none"
            stroke={todayColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {todayPoints.map((p, i) => (
          <g key={`t-dot-${i}`}>
            <circle cx={xPos(p.minuteOfDay)} cy={yPos(p.ml)} r={3.5} fill={todayColor} />
            <text
              x={xPos(p.minuteOfDay)}
              y={yPos(p.ml) - 7}
              textAnchor="middle"
              fontSize="7.5"
              fill={todayColor}
              fontWeight="600"
            >
              {p.ml}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-5">
        <div className="flex items-center gap-1.5">
          <div className="bg-primary h-2 w-4 rounded-sm" />
          <span className="text-muted-foreground text-xs">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-muted-foreground h-2 w-4 rounded-sm" />
          <span className="text-muted-foreground text-xs">Yesterday</span>
        </div>
      </div>
    </div>
  );
}

// ─── Breast Comparison Chart ──────────────────────────────────────────────────

interface BreastComparisonLineChartProps {
  todayPoints: BreastFeedingPoint[];
  yesterdayPoints: BreastFeedingPoint[];
}

function BreastComparisonLineChart({
  todayPoints,
  yesterdayPoints,
}: BreastComparisonLineChartProps) {
  const W = 320;
  const PAD = { top: 24, right: 12, bottom: 40, left: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = 120;
  const totalH = chartH + PAD.top + PAD.bottom;

  const allPoints = [...todayPoints, ...yesterdayPoints];
  const maxMin = Math.max(...allPoints.map((p) => p.minutes), 1);
  const yMax = Math.ceil(maxMin / 10) * 10 || 10;

  const xPos = (min: number) => PAD.left + (min / 1440) * chartW;
  const yPos = (val: number) => PAD.top + (1 - val / yMax) * chartH;

  const polyline = (points: BreastFeedingPoint[]) =>
    points.map((p) => `${xPos(p.minuteOfDay).toFixed(1)},${yPos(p.minutes).toFixed(1)}`).join(' ');

  const yTicks = [0, Math.round(yMax / 2), yMax];
  const xTicks = [0, 4, 8, 12, 16, 20].map((h) => h * 60);
  const todayColor = 'oklch(var(--primary))';
  const yesterdayColor = 'oklch(var(--muted-foreground))';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" style={{ height: `${totalH}px` }}>
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PAD.left}
              y1={yPos(tick)}
              x2={W - PAD.right}
              y2={yPos(tick)}
              stroke="oklch(var(--border))"
              strokeWidth="0.5"
              strokeDasharray={tick === 0 ? undefined : '2,2'}
            />
            <text
              x={PAD.left - 4}
              y={yPos(tick) + 3}
              textAnchor="end"
              fontSize="7"
              fill="oklch(var(--muted-foreground))"
            >
              {tick}m
            </text>
          </g>
        ))}
        {xTicks.map((min) => (
          <text
            key={`x-${min}`}
            x={xPos(min)}
            y={PAD.top + chartH + 13}
            textAnchor="middle"
            fontSize="7"
            fill="oklch(var(--muted-foreground))"
          >
            {formatHour(min)}
          </text>
        ))}
        {yesterdayPoints.length > 1 && (
          <polyline
            points={polyline(yesterdayPoints)}
            fill="none"
            stroke={yesterdayColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.7"
          />
        )}
        {yesterdayPoints.map((p, i) => (
          <g key={`y-dot-${i}`}>
            <circle
              cx={xPos(p.minuteOfDay)}
              cy={yPos(p.minutes)}
              r={3}
              fill={yesterdayColor}
              opacity="0.7"
            />
            <text
              x={xPos(p.minuteOfDay)}
              y={yPos(p.minutes) - 6}
              textAnchor="middle"
              fontSize="7"
              fill={yesterdayColor}
              fontWeight="600"
              opacity="0.8"
            >
              {p.minutes}m
            </text>
          </g>
        ))}
        {todayPoints.length > 1 && (
          <polyline
            points={polyline(todayPoints)}
            fill="none"
            stroke={todayColor}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {todayPoints.map((p, i) => (
          <g key={`t-dot-${i}`}>
            <circle cx={xPos(p.minuteOfDay)} cy={yPos(p.minutes)} r={3.5} fill={todayColor} />
            <text
              x={xPos(p.minuteOfDay)}
              y={yPos(p.minutes) - 7}
              textAnchor="middle"
              fontSize="7.5"
              fill={todayColor}
              fontWeight="600"
            >
              {p.minutes}m
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-center gap-5">
        <div className="flex items-center gap-1.5">
          <div className="bg-primary h-2 w-4 rounded-sm" />
          <span className="text-muted-foreground text-xs">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="bg-muted-foreground h-2 w-4 rounded-sm" />
          <span className="text-muted-foreground text-xs">Yesterday</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stacked Bar Chart ───────────────────────────────────────────────────────

interface StackedBarData {
  label: string;
  bottle: number;
  breast: number;
}

function StackedBarChart({ data }: { data: StackedBarData[] }) {
  const max = Math.max(...data.map((d) => d.bottle + d.breast), 1);
  return (
    <div className="flex h-20 items-end gap-0.5">
      {data.map((d, i) => {
        const total = d.bottle + d.breast;
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
            <span
              className={`text-muted-foreground text-[8px] leading-none ${total === 0 ? 'invisible' : ''}`}
            >
              {total}
            </span>
            <div className="flex w-full flex-col items-stretch">
              {d.breast > 0 && (
                <div
                  className="bg-accent w-full rounded-t-sm"
                  style={{ height: `${Math.max((d.breast / max) * 56, 2)}px` }}
                />
              )}
              {d.bottle > 0 && (
                <div
                  className={`bg-primary w-full ${d.breast === 0 ? 'rounded-t-sm' : ''}`}
                  style={{ height: `${Math.max((d.bottle / max) * 56, 2)}px` }}
                />
              )}
            </div>
            <span className="text-muted-foreground text-[8px] leading-none">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Growth Line Chart ───────────────────────────────────────────────────────

interface GrowthPoint {
  dateKey: string;
  label: string;
  value: number;
}

function extractGrowthPoints(
  logs: BabyLog[],
  logType: 'weight' | 'height',
  field: 'weightKg' | 'heightCm'
): GrowthPoint[] {
  const filtered = logs
    .filter((l) => l.logType === logType && l[field] !== null)
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  // Take the latest entry per day
  const dayMap = new Map<string, number>();
  for (const l of filtered) {
    const key = toDateKey(l.loggedAt);
    dayMap.set(key, l[field] as number);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, value]) => ({
      dateKey,
      label: shortDayLabel(dateKey),
      value,
    }));
}

interface GrowthLineChartProps {
  data: GrowthPoint[];
  unit: string;
  color?: string;
}

function GrowthLineChart({ data, unit, color = 'oklch(var(--primary))' }: GrowthLineChartProps) {
  if (data.length === 0) return null;

  const W = 320;
  const PAD = { top: 24, right: 16, bottom: 28, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = 120;
  const totalH = chartH + PAD.top + PAD.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;
  const yMin = minVal - range * 0.1;
  const yMax = maxVal + range * 0.1;

  const xPos = (i: number) =>
    PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
  const yPos = (val: number) => PAD.top + (1 - (val - yMin) / (yMax - yMin)) * chartH;

  const polyline = data
    .map((d, i) => `${xPos(i).toFixed(1)},${yPos(d.value).toFixed(1)}`)
    .join(' ');

  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map((v) =>
    Number(v.toFixed(unit === 'kg' ? 2 : 1))
  );

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" style={{ height: `${totalH}px` }}>
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={PAD.left}
              y1={yPos(tick)}
              x2={W - PAD.right}
              y2={yPos(tick)}
              stroke="oklch(var(--border))"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <text
              x={PAD.left - 4}
              y={yPos(tick) + 3}
              textAnchor="end"
              fontSize="7"
              fill="oklch(var(--muted-foreground))"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Line */}
        {data.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Dots + labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={xPos(i)} cy={yPos(d.value)} r={3.5} fill={color} />
            <text
              x={xPos(i)}
              y={yPos(d.value) - 7}
              textAnchor="middle"
              fontSize="7"
              fill={color}
              fontWeight="600"
            >
              {d.value}
            </text>
            <text
              x={xPos(i)}
              y={PAD.top + chartH + 12}
              textAnchor="middle"
              fontSize="7"
              fill="oklch(var(--muted-foreground))"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BabyAnalytics() {
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['baby-logs-analytics'],
    queryFn: () => babyLogsApi.listBabyLogs(undefined, 500, 0),
  });

  const logs: BabyLog[] = useMemo(() => query.data ?? [], [query.data]);
  const loading = query.isLoading;
  const error =
    query.error instanceof Error ? query.error.message : query.error ? 'Failed to load' : null;

  const dayStats = useMemo(() => computeDayStats(logs), [logs]);
  const recent = dayStats.slice(-14);
  const avgMlLast14 = useMemo(() => last14DaysAvgMlPerFeed(dayStats), [dayStats]);

  const todayKey = toDateKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = toDateKey(yesterdayDate.toISOString());
  const todayFeedingPoints = useMemo(() => extractFeedingPoints(logs, todayKey), [logs, todayKey]);
  const yesterdayFeedingPoints = useMemo(
    () => extractFeedingPoints(logs, yesterdayKey),
    [logs, yesterdayKey]
  );
  const todayBreastPoints = useMemo(() => extractBreastPoints(logs, todayKey), [logs, todayKey]);
  const yesterdayBreastPoints = useMemo(
    () => extractBreastPoints(logs, yesterdayKey),
    [logs, yesterdayKey]
  );
  const completedDayStats = dayStats.filter((d) => d.dateKey !== todayKey);
  const completedLogs = useMemo(
    () => logs.filter((l) => toDateKey(l.loggedAt) !== todayKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [logs]
  );
  const completedFeedings = completedLogs.filter((l) => l.logType === 'feeding');
  const totalBottle = completedFeedings.filter((l) => l.feedingType !== 'breast').length;
  const totalBreast = completedFeedings.filter((l) => l.feedingType === 'breast').length;
  const feedingsWithMl = logs.filter(
    (l) => l.logType === 'feeding' && l.feedingType !== 'breast' && l.feedingMl !== null
  );
  const avgMl =
    feedingsWithMl.length > 0
      ? Math.round(
          feedingsWithMl.reduce((s, l) => s + (l.feedingMl ?? 0), 0) / feedingsWithMl.length
        )
      : 0;
  const breastFeedings = logs.filter(
    (l) => l.logType === 'feeding' && l.feedingType === 'breast' && l.feedingDurationMin !== null
  );
  const avgBreastMin =
    breastFeedings.length > 0
      ? Math.round(
          breastFeedings.reduce((s, l) => s + (l.feedingDurationMin ?? 0), 0) /
            breastFeedings.length
        )
      : 0;
  const gapMin = useMemo(() => avgFeedingGapMin(logs), [logs]);
  const weightPoints = useMemo(() => extractGrowthPoints(logs, 'weight', 'weightKg'), [logs]);
  const heightPoints = useMemo(() => extractGrowthPoints(logs, 'height', 'heightCm'), [logs]);
  const feedsByPerson = useMemo(() => computeFeedsByPerson(logs), [logs]);
  const totalDays = dayStats.length;
  const avgFeedingsPerDay =
    completedDayStats.length > 0
      ? (
          completedDayStats.reduce((s, d) => s + d.feedingCount, 0) / completedDayStats.length
        ).toFixed(1)
      : '—';

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <header className="border-border flex items-center gap-2 border-b px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/baby-logs')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <TrendingUp className="text-primary h-5 w-5" />
        <h1 className="text-foreground text-xl font-bold">Analytics</h1>
        {!loading && (
          <span className="text-muted-foreground ml-auto text-xs">{totalDays}d of data</span>
        )}
        <Button variant="ghost" size="icon" onClick={() => navigate('/baby-logs/growth')}>
          <LineChart className="h-5 w-5" />
        </Button>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      )}
      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive border-b px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <main className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-8">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Milk className="h-3 w-3" />}
              label="Avg feedings/day"
              value={avgFeedingsPerDay}
              sub={`${totalBottle}b ${totalBreast}bf · today excluded`}
            />
            <StatCard
              icon={<Milk className="h-3 w-3" />}
              label="Avg ml/bottle"
              value={avgMl > 0 ? `${avgMl}ml` : '—'}
              sub={`${feedingsWithMl.length} bottle feeds`}
            />
            <StatCard
              icon={<Clock className="h-3 w-3" />}
              label="Avg breast time"
              value={avgBreastMin > 0 ? fmtMinutes(avgBreastMin) : '—'}
              sub={`${breastFeedings.length} breast feeds`}
            />
            <StatCard
              icon={<Clock className="h-3 w-3" />}
              label="Avg feeding gap"
              value={gapMin > 0 ? `${Math.floor(gapMin / 60)}h ${gapMin % 60}m` : '—'}
              sub={`${totalDays}d tracked · ${logs.length} logs`}
            />
          </div>

          {/* Feeds by person — total + below avg per week */}
          {feedsByPerson.length > 0 && (
            <ChartSection
              title="Feeds by person"
              subtitle={`Last ${feedsByPerson[0].weeks.length} weeks · total (below avg)`}
              action={<Users className="text-muted-foreground h-4 w-4" />}
            >
              <div className="space-y-3">
                {/* Week header row */}
                <div className="flex items-center gap-2">
                  <span className="w-14" />
                  {feedsByPerson[0].weeks.map((w, i) => (
                    <span
                      key={i}
                      className="text-muted-foreground flex-1 text-center text-[10px] font-medium"
                    >
                      {w.label}
                    </span>
                  ))}
                </div>
                {feedsByPerson.map((p) => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="text-foreground w-14 truncate text-xs font-medium">
                      {p.name}
                    </span>
                    {p.weeks.map((w, i) => (
                      <div
                        key={i}
                        className="border-border flex flex-1 flex-col items-center rounded-lg border px-1 py-1"
                      >
                        <span className="text-foreground text-sm font-bold">{w.total}</span>
                        {w.belowAvg > 0 ? (
                          <span className="text-destructive text-[10px] font-medium">
                            {w.belowAvg} low
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">0 low</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ChartSection>
          )}

          {/* Weight over time */}
          {weightPoints.length > 0 && (
            <ChartSection
              title="Weight over time"
              subtitle={`${weightPoints.length} measurement${weightPoints.length > 1 ? 's' : ''}`}
              action={<Weight className="text-muted-foreground h-4 w-4" />}
            >
              <GrowthLineChart data={weightPoints} unit="kg" />
            </ChartSection>
          )}

          {/* Height over time */}
          {heightPoints.length > 0 && (
            <ChartSection
              title="Height over time"
              subtitle={`${heightPoints.length} measurement${heightPoints.length > 1 ? 's' : ''}`}
              action={<Ruler className="text-muted-foreground h-4 w-4" />}
            >
              <GrowthLineChart data={heightPoints} unit="cm" color="oklch(var(--accent))" />
            </ChartSection>
          )}

          {/* Today vs Yesterday bottle comparison */}
          {(todayFeedingPoints.length > 0 || yesterdayFeedingPoints.length > 0) && (
            <ChartSection title="Bottle comparison" subtitle="Today vs Yesterday · cumulative ml">
              <ComparisonLineChart
                todayPoints={todayFeedingPoints}
                yesterdayPoints={yesterdayFeedingPoints}
              />
            </ChartSection>
          )}

          {/* Today vs Yesterday breast comparison */}
          {(todayBreastPoints.length > 0 || yesterdayBreastPoints.length > 0) && (
            <ChartSection title="Breast comparison" subtitle="Today vs Yesterday · cumulative min">
              <BreastComparisonLineChart
                todayPoints={todayBreastPoints}
                yesterdayPoints={yesterdayBreastPoints}
              />
            </ChartSection>
          )}

          {/* Feedings per day (stacked bottle + breast) */}
          {recent.length > 0 && (
            <ChartSection
              title="Feedings per day"
              subtitle="Last 14 days"
              action={
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="bg-primary h-2 w-3 rounded-sm" />
                    <span className="text-muted-foreground text-[10px]">Bottle</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-accent h-2 w-3 rounded-sm" />
                    <span className="text-muted-foreground text-[10px]">Breast</span>
                  </div>
                </div>
              }
            >
              <StackedBarChart
                data={recent.map((d) => ({
                  label: d.label,
                  bottle: d.bottleCount,
                  breast: d.breastCount,
                }))}
              />
            </ChartSection>
          )}

          {/* Total ml per day */}
          {recent.some((d) => d.totalMl > 0) && (
            <ChartSection title="Total ml per day" subtitle="Last 14 days">
              <BarChart
                data={recent.map((d) => ({ label: d.label, value: d.totalMl }))}
                colorClass="bg-primary"
              />
            </ChartSection>
          )}

          {/* Avg ml per bottle feed per day */}
          {avgMlLast14.some((d) => d.value > 0) && (
            <ChartSection title="Avg ml per bottle feed" subtitle="Last 14 days">
              <BarChart data={avgMlLast14} unit="ml" colorClass="bg-accent" />
            </ChartSection>
          )}

          {/* Avg breast duration per day */}
          {recent.some((d) => d.avgBreastDurationMin > 0) && (
            <ChartSection title="Avg breast feed duration" subtitle="Last 14 days">
              <BarChart
                data={recent.map((d) => ({ label: d.label, value: d.avgBreastDurationMin }))}
                colorClass="bg-accent"
                formatValue={fmtMinutes}
              />
            </ChartSection>
          )}

          {/* Avg gap between feeds per day */}
          {recent.some((d) => d.avgGapMin > 0) && (
            <ChartSection title="Avg gap between feeds" subtitle="Last 14 days">
              <BarChart
                data={recent.map((d) => ({ label: d.label, value: d.avgGapMin }))}
                colorClass="bg-secondary"
                formatValue={fmtMinutes}
              />
            </ChartSection>
          )}

          {/* Avg feeding duration per day */}
          {recent.some((d) => d.avgDurationMin > 0) && (
            <ChartSection title="Avg feeding duration" subtitle="Last 14 days">
              <BarChart
                data={recent.map((d) => ({ label: d.label, value: d.avgDurationMin }))}
                colorClass="bg-accent"
                formatValue={fmtMinutes}
              />
            </ChartSection>
          )}

          {/* Wet diapers per day */}
          {recent.some((d) => d.wetCount > 0) && (
            <ChartSection title="Wet diapers per day" subtitle="Last 14 days">
              <BarChart
                data={recent.map((d) => ({ label: d.label, value: d.wetCount }))}
                colorStyle="hsl(210 80% 55%)"
              />
            </ChartSection>
          )}

          {/* Poop per day */}
          {recent.some((d) => d.poopCount > 0) && (
            <ChartSection title="Poop per day" subtitle="Last 14 days">
              <BarChart
                data={recent.map((d) => ({ label: d.label, value: d.poopCount }))}
                colorStyle="hsl(25 55% 40%)"
              />
            </ChartSection>
          )}

          {logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <TrendingUp className="text-muted-foreground/40 mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">No logs yet to analyze.</p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
