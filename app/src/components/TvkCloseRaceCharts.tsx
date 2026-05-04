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

// 234 total: TVK leading 106, trailing 2nd in 69, not in top-2 in 59
// Safe win (>5K margin): 56 | Close win (<5K): 50 | Close loss (<5K): 50 | No chance: 78
const TVK_STATUS = [
  { name: 'Safe Win (>5K)', value: 56, color: '#16a34a' },
  { name: 'Close Win (<5K)', value: 50, color: '#86efac' },
  { name: 'Close Loss (<5K)', value: 50, color: '#fb923c' },
  { name: 'No Chance', value: 78, color: '#cbd5e1' },
];

const PARTY_COLOR: Record<string, string> = {
  ADMK: '#a3731a',
  DMK: '#22c55e',
  INC: '#3b82f6',
  PMK: '#65a30d',
  BJP: '#f97316',
  DMDK: '#d97706',
};

// Top 15 closest TVK losses — all lost by <1,000 votes except last 4
const TVK_CLOSE_LOSSES = [
  { name: 'Cuddalore', by: 'INC', margin: 26 },
  { name: 'Valparai', by: 'DMK', margin: 113 },
  { name: 'Madurantakam', by: 'ADMK', margin: 118 },
  { name: 'Cbe South', by: 'DMK', margin: 127 },
  { name: 'Kangayam', by: 'ADMK', margin: 301 },
  { name: 'Veerapandi', by: 'ADMK', margin: 338 },
  { name: 'Vikravandi', by: 'PMK', margin: 406 },
  { name: 'Ooty', by: 'BJP', margin: 509 },
  { name: 'Yercaud', by: 'ADMK', margin: 522 },
  { name: 'Kancheepuram', by: 'ADMK', margin: 692 },
  { name: 'Virudhunagar', by: 'DMDK', margin: 897 },
  { name: 'Nilakkottai', by: 'DMK', margin: 1288 },
  { name: 'Tiruvadanai', by: 'INC', margin: 1288 },
  { name: 'Nagercoil', by: 'DMK', margin: 1379 },
  { name: 'Sankarankovil', by: 'ADMK', margin: 1425 },
];

// Parties leading where TVK is in 2nd place (69 seats)
const WHO_BEATS_TVK = [
  { party: 'ADMK', seats: 28, fill: '#a3731a' },
  { party: 'DMK', seats: 27, fill: '#22c55e' },
  { party: 'INC', seats: 4, fill: '#3b82f6' },
  { party: 'PMK', seats: 4, fill: '#65a30d' },
  { party: 'DMDK', seats: 2, fill: '#d97706' },
  { party: 'BJP', seats: 1, fill: '#f97316' },
  { party: 'CPI', seats: 1, fill: '#dc2626' },
  { party: 'CPI(M)', seats: 1, fill: '#b91c1c' },
  { party: 'IUML', seats: 1, fill: '#0284c7' },
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
        Competitive in 156 seats (106 won + 50 close losses)
      </p>
    </ChartCard>
  );
}

export function TvkCloseRacesChart() {
  return (
    <ChartCard title="15 Closest TVK Losses — could have swung">
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
        Bar color = winning party · 50 total seats lost by &lt;5K votes
      </p>
    </ChartCard>
  );
}

export function TvkBeaterChart() {
  return (
    <ChartCard title="Who Beats TVK — 69 seats (TVK in 2nd place)">
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
        59 more seats TVK wasn't in top 2 (not competitive)
      </p>
    </ChartCard>
  );
}
