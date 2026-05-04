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

// 234 total: TVK 30 Won + 78 Leading = 108 — latest round
// Won(30) + Safe lead >5K(64) + Close lead <5K(14) + Close loss ~27 + Not competitive ~99
const TVK_STATUS = [
  { name: 'Won (Final)', value: 30, color: '#0ea5e9' },
  { name: 'Safe Lead (>5K)', value: 64, color: '#16a34a' },
  { name: 'Close Lead (<5K)', value: 14, color: '#86efac' },
  { name: 'Close Loss (<5K)', value: 27, color: '#fb923c' },
  { name: 'Not Competitive', value: 99, color: '#cbd5e1' },
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

// Top 12 closest TVK losses (latest round — Kallakurichi new#1 ADMK+156; 27 total <5K losses)
const TVK_CLOSE_LOSSES = [
  { name: 'Kallakurichi', by: 'ADMK', margin: 156 },
  { name: 'Thirumayam', by: 'DMK', margin: 396 },
  { name: 'Tiruvannamalai', by: 'DMK', margin: 402 },
  { name: 'Palani', by: 'ADMK', margin: 753 },
  { name: 'Udhagamandalam', by: 'BJP', margin: 976 },
  { name: 'Dindigul', by: 'DMK', margin: 1131 },
  { name: 'Tittakudi', by: 'DMK', margin: 1416 },
  { name: 'Cumbum', by: 'DMK', margin: 1873 },
  { name: 'Bargur', by: 'ADMK', margin: 1939 },
  { name: 'Coimbatore (S)', by: 'DMK', margin: 2271 },
  { name: 'Kilvelur', by: 'CPI(M)', margin: 2278 },
  { name: 'Vriddhachalam', by: 'DMDK', margin: 2389 },
];

// Parties leading where TVK is in 2nd place (76 seats, latest round)
const WHO_BEATS_TVK = [
  { party: 'DMK', seats: 38, fill: '#22c55e' },
  { party: 'ADMK', seats: 23, fill: '#a3731a' },
  { party: 'INC', seats: 4, fill: '#3b82f6' },
  { party: 'PMK', seats: 4, fill: '#65a30d' },
  { party: 'CPI(M)', seats: 2, fill: '#b91c1c' },
  { party: 'IUML', seats: 2, fill: '#0284c7' },
  { party: 'CPI', seats: 1, fill: '#dc2626' },
  { party: 'BJP', seats: 1, fill: '#f97316' },
  { party: 'DMDK', seats: 1, fill: '#d97706' },
];

export function TvkStatusBreakdown() {
  return (
    <ChartCard title="TVK Seat Status (234 constituencies) — May 4 final round">
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
        Competitive in ~135 seats (108 leading + ~27 close losses) · 30 officially Won
      </p>
    </ChartCard>
  );
}

export function TvkCloseRacesChart() {
  return (
    <ChartCard title="12 Closest TVK Losses — May 4 final (27 total <5K)">
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
        Bar color = winning party · 27 total seats lost by &lt;5K · Kallakurichi new #1 (ADMK+156)
      </p>
    </ChartCard>
  );
}

export function TvkBeaterChart() {
  return (
    <ChartCard title="Who Beats TVK — 76 seats (May 4 final round)">
      <ResponsiveContainer width="100%" height={220}>
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
        50 seats TVK not in top 2 · 76 seats TVK is in 2nd place · DMK 36→38 · ADMK 22→23
      </p>
    </ChartCard>
  );
}
