import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { PercentileEntry, GrowthMetric } from '../lib/who-growth-data';
import { getWhoData, estimatePercentile, PERCENTILE_LABELS } from '../lib/who-growth-data';
import type { Gender } from '../types';

interface BabyDataPoint {
  ageMonths: number;
  value: number;
  date: string;
}

interface PercentileChartProps {
  gender: Gender;
  metric: GrowthMetric;
  babyData: BabyDataPoint[];
  unit: string;
  label: string;
}

interface ChartRow {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
  baby?: number;
  babyDate?: string;
  babyPercentile?: number;
}

function buildChartData(
  whoData: PercentileEntry[],
  babyData: BabyDataPoint[],
  gender: Gender,
  metric: GrowthMetric
): ChartRow[] {
  const rows: ChartRow[] = whoData.map((entry) => ({
    month: entry.month,
    p3: entry.p3,
    p15: entry.p15,
    p50: entry.p50,
    p85: entry.p85,
    p97: entry.p97,
  }));

  for (const point of babyData) {
    const month = Math.round(point.ageMonths);
    const existing = rows.find((r) => r.month === month);
    if (existing) {
      existing.baby = point.value;
      existing.babyDate = point.date;
      existing.babyPercentile = estimatePercentile(gender, metric, point.ageMonths, point.value);
    }
  }

  return rows;
}

function CustomTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="border-border bg-card rounded-lg border px-3 py-2 shadow-lg">
      <p className="text-foreground text-xs font-medium">Month {data.month}</p>
      {data.baby !== undefined && (
        <>
          <p className="text-primary text-sm font-bold">
            {data.baby} {unit}
          </p>
          <p className="text-muted-foreground text-xs">{data.babyPercentile}th percentile</p>
          {data.babyDate && <p className="text-muted-foreground text-xs">{data.babyDate}</p>}
        </>
      )}
      <div className="mt-1 space-y-0.5">
        {(['p97', 'p85', 'p50', 'p15', 'p3'] as const).map((key) => (
          <p key={key} className="text-muted-foreground text-[10px]">
            {PERCENTILE_LABELS[key]}: {data[key]} {unit}
          </p>
        ))}
      </div>
    </div>
  );
}

const BAND_COLORS = {
  outer: 'oklch(0.85 0.02 250)',
  inner: 'oklch(0.80 0.04 250)',
};

export function PercentileChart({ gender, metric, babyData, unit, label }: PercentileChartProps) {
  const whoData = getWhoData(gender, metric);
  const chartData = useMemo(
    () => buildChartData(whoData, babyData, gender, metric),
    [whoData, babyData, gender, metric]
  );

  const latestBaby = babyData.length > 0 ? babyData[babyData.length - 1] : null;
  const latestPercentile = latestBaby
    ? estimatePercentile(gender, metric, latestBaby.ageMonths, latestBaby.value)
    : null;

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="mb-1 flex items-start justify-between">
        <div>
          <h3 className="text-foreground text-sm font-semibold">{label}</h3>
          <p className="text-muted-foreground text-xs">
            WHO {gender === 'male' ? 'Boys' : 'Girls'} 0-24mo
          </p>
        </div>
        {latestPercentile !== null && (
          <div className="bg-primary/10 rounded-lg px-2.5 py-1">
            <span className="text-primary text-sm font-bold">{latestPercentile}th</span>
          </div>
        )}
      </div>

      <div className="mt-2" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: 'oklch(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'Months',
                position: 'insideBottomRight',
                offset: -5,
                fontSize: 10,
                fill: 'oklch(var(--muted-foreground))',
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'oklch(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              label={{
                value: unit,
                angle: -90,
                position: 'insideLeft',
                offset: 15,
                fontSize: 10,
                fill: 'oklch(var(--muted-foreground))',
              }}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />

            {/* Outer band: 3rd-97th */}
            <Area dataKey="p97" stroke="none" fill={BAND_COLORS.outer} fillOpacity={0.3} />
            <Area dataKey="p3" stroke="none" fill="oklch(var(--background))" fillOpacity={1} />

            {/* Inner band: 15th-85th */}
            <Area dataKey="p85" stroke="none" fill={BAND_COLORS.inner} fillOpacity={0.3} />
            <Area dataKey="p15" stroke="none" fill="oklch(var(--background))" fillOpacity={1} />

            {/* Median line */}
            <Line
              dataKey="p50"
              stroke="oklch(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />

            {/* Baby's data */}
            <Line
              dataKey="baby"
              stroke="oklch(var(--primary))"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: 'oklch(var(--primary))',
                strokeWidth: 2,
                stroke: 'oklch(var(--background))',
              }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-1.5">
          <div className="bg-primary h-2 w-4 rounded-sm" />
          <span className="text-muted-foreground text-[10px]">Baby</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="border-muted-foreground h-0.5 w-4 border-t border-dashed" />
          <span className="text-muted-foreground text-[10px]">50th</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-4 rounded-sm opacity-30"
            style={{ backgroundColor: BAND_COLORS.inner }}
          />
          <span className="text-muted-foreground text-[10px]">15-85th</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-4 rounded-sm opacity-30"
            style={{ backgroundColor: BAND_COLORS.outer }}
          />
          <span className="text-muted-foreground text-[10px]">3-97th</span>
        </div>
      </div>
    </div>
  );
}

export type { BabyDataPoint };
