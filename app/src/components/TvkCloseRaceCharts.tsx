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

// 234 total: TVK 69 Won + 37 Leading = 106 — 8:00 PM final
// Won(69) + Safe lead >5K(19) + Close lead <5K(18) + Close loss(29) + Not competitive(99)
const TVK_STATUS = [
  { name: 'Won (Final)', value: 69, color: '#0ea5e9' },
  { name: 'Safe Lead (>5K)', value: 19, color: '#16a34a' },
  { name: 'Close Lead (<5K)', value: 18, color: '#86efac' },
  { name: 'Close Loss (<5K)', value: 29, color: '#fb923c' },
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

// Top 15 closest TVK losses (8:00 PM final — 29 total <5K losses)
// Polur FLIPPED: was TVK+258, now DMDK+67 (new #1 closest loss!)
const TVK_CLOSE_LOSSES = [
  { name: 'Polur', by: 'DMDK', margin: 67 },
  { name: 'Sholingur', by: 'PMK', margin: 146 },
  { name: 'Tirukkoyilur', by: 'ADMK', margin: 161 },
  { name: 'Vikravandi', by: 'PMK', margin: 668 },
  { name: 'Palani', by: 'ADMK', margin: 693 },
  { name: 'Kovilpatti', by: 'DMK', margin: 843 },
  { name: 'Udhagamandalam', by: 'BJP', margin: 976 },
  { name: 'Papanasam', by: 'IUML', margin: 1065 },
  { name: 'Tiruppattur', by: 'DMK', margin: 1127 },
  { name: 'Dindigul', by: 'DMK', margin: 1131 },
  { name: 'Karur', by: 'ADMK', margin: 1340 },
  { name: 'Killiyoor', by: 'INC', margin: 1428 },
  { name: 'Thirumayam', by: 'DMK', margin: 1492 },
  { name: 'Pudukkottai', by: 'DMK', margin: 1867 },
  { name: 'Yercaud', by: 'ADMK', margin: 2189 },
];

// Parties leading where TVK is in 2nd place (76 seats, 8:00 PM final)
const WHO_BEATS_TVK = [
  { party: 'DMK', seats: 37, fill: '#22c55e' },
  { party: 'ADMK', seats: 24, fill: '#a3731a' },
  { party: 'INC', seats: 4, fill: '#3b82f6' },
  { party: 'PMK', seats: 3, fill: '#65a30d' },
  { party: 'CPI(M)', seats: 2, fill: '#b91c1c' },
  { party: 'IUML', seats: 2, fill: '#0284c7' },
  { party: 'DMDK', seats: 2, fill: '#d97706' },
  { party: 'CPI', seats: 1, fill: '#dc2626' },
  { party: 'BJP', seats: 1, fill: '#f97316' },
];

export function TvkStatusBreakdown() {
  return (
    <ChartCard title="TVK Seat Status (234 constituencies) — May 4, 8:00 PM Final">
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
        Competitive in 135 seats (106 leading + 29 close losses) · 69 officially Won · 18 close leads
      </p>
    </ChartCard>
  );
}

export function TvkCloseRacesChart() {
  return (
    <ChartCard title="15 Closest TVK Losses — May 4, 8:00 PM Final (29 total <5K)">
      <ResponsiveContainer width="100%" height={380}>
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
        Bar color = winning party · 29 total lost by &lt;5K · Polur DMDK+67 closest · Kumbakonam TVK+535 riskiest win
      </p>
    </ChartCard>
  );
}

export function TvkBeaterChart() {
  return (
    <ChartCard title="Who Beats TVK — 76 seats (May 4, 7:33 PM)">
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
        52 seats TVK not in top 2 · 76 seats TVK is in 2nd place · DMK 37 · ADMK 24
      </p>
    </ChartCard>
  );
}
