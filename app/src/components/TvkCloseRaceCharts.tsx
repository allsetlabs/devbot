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

// 234 total: TVK leading/won 107, trailing 2nd in 69, not in top-2 in 58 — live May 4 latest round
// Safe lead (>5K margin): 75 | Close lead (<5K): 32 | Close loss (<5K): 31 | Not competitive: 96
const TVK_STATUS = [
  { name: 'Safe Lead (>5K)', value: 75, color: '#16a34a' },
  { name: 'Close Lead (<5K)', value: 32, color: '#86efac' },
  { name: 'Close Loss (<5K)', value: 31, color: '#fb923c' },
  { name: 'Not Competitive', value: 96, color: '#cbd5e1' },
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
  IUML: '#0284c7',
};

// Top 15 closest TVK losses (live count, May 4 2026 — latest round refresh)
const TVK_CLOSE_LOSSES = [
  { name: 'Kumbakonam', by: 'DMK', margin: 86 },
  { name: 'Srivaikuntam', by: 'ADMK', margin: 136 },
  { name: 'Katpadi', by: 'ADMK', margin: 141 },
  { name: 'Tiruvannamalai', by: 'DMK', margin: 291 },
  { name: 'Tittakudi', by: 'DMK', margin: 530 },
  { name: 'Kilvelur', by: 'CPI(M)', margin: 663 },
  { name: 'Vikravandi', by: 'PMK', margin: 730 },
  { name: 'Killiyoor', by: 'INC', margin: 910 },
  { name: 'Paramakudi', by: 'DMK', margin: 1132 },
  { name: 'Cbe South', by: 'DMK', margin: 1231 },
  { name: 'Udhagamandalam', by: 'BJP', margin: 1231 },
  { name: 'Lalgudi', by: 'ADMK', margin: 1368 },
  { name: 'Dindigul', by: 'DMK', margin: 1471 },
  { name: 'Viluppuram', by: 'DMK', margin: 1491 },
  { name: 'Pudukkottai', by: 'DMK', margin: 2376 },
];

// Parties leading where TVK is in 2nd place (69 seats, live May 4 2026 latest round)
const WHO_BEATS_TVK = [
  { party: 'DMK', seats: 33, fill: '#22c55e' },
  { party: 'ADMK', seats: 22, fill: '#a3731a' },
  { party: 'INC', seats: 4, fill: '#3b82f6' },
  { party: 'PMK', seats: 2, fill: '#65a30d' },
  { party: 'CPI(M)', seats: 2, fill: '#b91c1c' },
  { party: 'IUML', seats: 2, fill: '#0284c7' },
  { party: 'CPI', seats: 2, fill: '#dc2626' },
  { party: 'DMDK', seats: 1, fill: '#d97706' },
  { party: 'BJP', seats: 1, fill: '#f97316' },
];

export function TvkStatusBreakdown() {
  return (
    <ChartCard title="TVK Seat Status (234 constituencies) — latest round">
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
        Competitive in 138 seats (107 leading + 31 close losses)
      </p>
    </ChartCard>
  );
}

export function TvkCloseRacesChart() {
  return (
    <ChartCard title="15 Closest TVK Losses — May 4 (latest round)">
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
        Bar color = winning party · 31 total seats lost by &lt;5K · Kumbakonam lost by 86 votes!
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
        58 seats TVK wasn't in top 2 · 69 seats TVK is in 2nd place
      </p>
    </ChartCard>
  );
}
