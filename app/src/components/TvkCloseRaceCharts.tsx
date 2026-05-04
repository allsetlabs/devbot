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

// 234 total: TVK leading 110, trailing 2nd in 66, not in top-2 in 58
// Safe lead (>5K margin): 62 | Close lead (<5K): 48 | Close loss (<5K): 40 | No chance: 84
const TVK_STATUS = [
  { name: 'Safe Lead (>5K)', value: 62, color: '#16a34a' },
  { name: 'Close Lead (<5K)', value: 48, color: '#86efac' },
  { name: 'Close Loss (<5K)', value: 40, color: '#fb923c' },
  { name: 'No Chance', value: 84, color: '#cbd5e1' },
];

const PARTY_COLOR: Record<string, string> = {
  ADMK: '#a3731a',
  DMK: '#22c55e',
  INC: '#3b82f6',
  PMK: '#65a30d',
  BJP: '#f97316',
  DMDK: '#d97706',
};

// Top 15 closest TVK losses (live count, May 4 2026) — 7 lost by <1,000 votes
const TVK_CLOSE_LOSSES = [
  { name: 'Tiruchuli', by: 'DMK', margin: 29 },
  { name: 'Madurantakam', by: 'ADMK', margin: 118 },
  { name: 'Vikravandi', by: 'PMK', margin: 406 },
  { name: 'Tiruchendur', by: 'DMK', margin: 453 },
  { name: 'Valparai', by: 'DMK', margin: 742 },
  { name: 'Cbe South', by: 'DMK', margin: 803 },
  { name: 'Namakkal', by: 'ADMK', margin: 980 },
  { name: 'Nagercoil', by: 'DMK', margin: 1172 },
  { name: 'Vriddhachalam', by: 'DMDK', margin: 1212 },
  { name: 'Sivakasi', by: 'ADMK', margin: 1261 },
  { name: 'Srivaikuntam', by: 'ADMK', margin: 1436 },
  { name: 'Kangayam', by: 'ADMK', margin: 1496 },
  { name: 'Viluppuram', by: 'DMK', margin: 1668 },
  { name: 'Tirukkoyilur', by: 'ADMK', margin: 1695 },
  { name: 'Pennagaram', by: 'PMK', margin: 1754 },
];

// Parties leading where TVK is in 2nd place (66 seats, live May 4 2026)
const WHO_BEATS_TVK = [
  { party: 'DMK', seats: 29, fill: '#22c55e' },
  { party: 'ADMK', seats: 27, fill: '#a3731a' },
  { party: 'INC', seats: 3, fill: '#3b82f6' },
  { party: 'PMK', seats: 3, fill: '#65a30d' },
  { party: 'CPI(M)', seats: 1, fill: '#b91c1c' },
  { party: 'CPI', seats: 1, fill: '#dc2626' },
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
        Competitive in 150 seats (110 leading + 40 close losses)
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
          margin={{ top: 0, right: 50, left: 88, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={88} />
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
        Bar color = winning party · 40 total seats lost by &lt;5K votes (live)
      </p>
    </ChartCard>
  );
}

export function TvkBeaterChart() {
  return (
    <ChartCard title="Who Beats TVK — 66 seats (TVK in 2nd place)">
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
        58 more seats TVK wasn't in top 2 (not competitive)
      </p>
    </ChartCard>
  );
}
