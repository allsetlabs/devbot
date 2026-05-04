import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartCard } from './TvkElectionCharts';

// 234 total: TVK leading 109, trailing 2nd in 70, not in top-2 in 55
// Safe lead (>5K margin): 68 | Close lead (<5K): 41 | Close loss (<5K): 39 | Not competitive: 86
const TVK_STATUS = [
  { name: 'Safe Lead (>5K)', value: 68, color: '#16a34a' },
  { name: 'Close Lead (<5K)', value: 41, color: '#86efac' },
  { name: 'Close Loss (<5K)', value: 39, color: '#fb923c' },
  { name: 'Not Competitive', value: 86, color: '#cbd5e1' },
];

const PARTY_COLOR: Record<string, string> = {
  ADMK: '#a3731a',
  DMK: '#22c55e',
  INC: '#3b82f6',
  PMK: '#65a30d',
  BJP: '#f97316',
  DMDK: '#d97706',
  CPI: '#dc2626',
  'CPI(M)': '#b91c1c',
};

// Top 15 closest TVK losses (live count, May 4 2026)
const TVK_CLOSE_LOSSES = [
  { name: 'Bodinayakanur', by: 'DMK', margin: 173 },
  { name: 'Namakkal', by: 'ADMK', margin: 460 },
  { name: 'Tiruchuli', by: 'DMK', margin: 466 },
  { name: 'Rishivandiyam', by: 'DMK', margin: 503 },
  { name: 'Vikravandi', by: 'PMK', margin: 547 },
  { name: 'Nagercoil', by: 'DMK', margin: 774 },
  { name: 'Sankari', by: 'ADMK', margin: 812 },
  { name: 'Cbe South', by: 'DMK', margin: 821 },
  { name: 'Srivaikuntam', by: 'ADMK', margin: 955 },
  { name: 'Viluppuram', by: 'DMK', margin: 1015 },
  { name: 'Chepauk', by: 'DMK', margin: 1048 },
  { name: 'Sivakasi', by: 'ADMK', margin: 1261 },
  { name: 'Madurantakam', by: 'ADMK', margin: 1424 },
  { name: 'Tirukkoyilur', by: 'ADMK', margin: 1438 },
  { name: 'Bhavanisagar', by: 'ADMK', margin: 1552 },
];

// Parties leading where TVK is in 2nd place (70 seats, live May 4 2026)
const WHO_BEATS_TVK = [
  { party: 'DMK', seats: 32, fill: '#22c55e' },
  { party: 'ADMK', seats: 28, fill: '#a3731a' },
  { party: 'PMK', seats: 3, fill: '#65a30d' },
  { party: 'INC', seats: 2, fill: '#3b82f6' },
  { party: 'CPI', seats: 2, fill: '#dc2626' },
  { party: 'CPI(M)', seats: 1, fill: '#b91c1c' },
  { party: 'IUML', seats: 1, fill: '#0284c7' },
  { party: 'DMDK', seats: 1, fill: '#d97706' },
];

export function TvkStatusBreakdown() {
  return (
    <ChartCard title="TVK Seat Status (234 constituencies)">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie
            data={TVK_STATUS}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {TVK_STATUS.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [`${v} seats`, n]}
            contentStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {TVK_STATUS.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <div>
              <div className="text-xs text-muted-foreground">{s.name}</div>
              <div className="text-sm font-bold text-foreground">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Competitive in 148 seats (109 leading + 39 close losses)
      </p>
    </ChartCard>
  );
}

export function TvkCloseRacesChart() {
  return (
    <ChartCard title="15 Closest TVK Losses — live count May 4">
      <ResponsiveContainer width="100%" height={310}>
        <BarChart
          data={TVK_CLOSE_LOSSES}
          layout="vertical"
          margin={{ top: 0, right: 50, left: 100, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
          <Tooltip
            formatter={(v: number) => [`Lost by ${v} votes`]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
            {TVK_CLOSE_LOSSES.map((entry) => (
              <Cell key={entry.name} fill={PARTY_COLOR[entry.by] ?? '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Bar color = winning party · 39 total seats lost by &lt;5K votes · Bodinayakanur lost by 173 votes
      </p>
    </ChartCard>
  );
}

export function TvkBeaterChart() {
  return (
    <ChartCard title="Who Beats TVK — 70 seats (TVK in 2nd place)">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={WHO_BEATS_TVK} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="party" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`${v} seats`]} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {WHO_BEATS_TVK.map((entry) => (
              <Cell key={entry.party} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        55 more seats TVK wasn't in top 2 (not competitive)
      </p>
    </ChartCard>
  );
}
