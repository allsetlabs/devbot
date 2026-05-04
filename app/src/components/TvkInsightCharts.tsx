import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
} from 'recharts';
import { ChartCard } from './TvkElectionCharts';

// Alliance groupings — Tamil Nadu 2026
// TVK contested solo. DMK, ADMK contested with allies.
const ALLIANCE_DATA = [
  { name: 'TVK\n(Solo)', seats: 106, fill: '#e855a8', label: 'TVK' },
  { name: 'DMK\nAlliance', seats: 65, fill: '#22c55e', label: 'DMK(54)+INC(4)+VCK(1)+CPI(3)+CPI(M)(1)+IUML(2)' },
  { name: 'ADMK\n(Solo)', seats: 55, fill: '#a3731a', label: 'ADMK' },
  { name: 'PMK &\nOthers', seats: 7, fill: '#94a3b8', label: 'PMK(5)+DMDK(1)+AMMK(1)' },
  { name: 'BJP', seats: 1, fill: '#f97316', label: 'BJP' },
];

// Pie data for alliance share of 234 seats
const ALLIANCE_PIE = [
  { name: 'TVK (Solo)', value: 106, color: '#e855a8' },
  { name: 'DMK Alliance', value: 65, color: '#22c55e' },
  { name: 'ADMK (Solo)', value: 55, color: '#a3731a' },
  { name: 'PMK & Others', value: 7, color: '#94a3b8' },
  { name: 'BJP', value: 1, color: '#f97316' },
];

// 39 seats TVK lost by <5K — breakdown by winning party
const CLOSE_LOSS_BY_PARTY = [
  { party: 'DMK', seats: 18, fill: '#22c55e' },
  { party: 'ADMK', seats: 15, fill: '#a3731a' },
  { party: 'INC', seats: 2, fill: '#3b82f6' },
  { party: 'CPI', seats: 1, fill: '#dc2626' },
  { party: 'BJP', seats: 1, fill: '#f97316' },
  { party: 'PMK', seats: 1, fill: '#65a30d' },
  { party: 'DMDK', seats: 1, fill: '#d97706' },
];

export function TvkAlliancePieChart() {
  return (
    <ChartCard title="Seat Share by Alliance (234 seats)">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={ALLIANCE_PIE}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {ALLIANCE_PIE.map((entry) => (
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
        {ALLIANCE_PIE.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <div>
              <div className="text-xs text-muted-foreground">{s.name}</div>
              <div className="text-sm font-bold text-foreground">{s.value} seats</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        TVK contested ALL 234 seats solo — unprecedented debut · DMK Alliance surged to 65 seats
      </p>
    </ChartCard>
  );
}

export function TvkAllianceBarChart() {
  return (
    <ChartCard title="Alliance vs TVK — Seat Comparison">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={ALLIANCE_DATA} margin={{ top: 4, right: 8, left: -16, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
          <Tooltip
            formatter={(v: number, _n: string, props: { payload?: { label?: string } }) => [
              `${v} seats`,
              props?.payload?.label ?? '',
            ]}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            y={118}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: '118 majority', fontSize: 9, fill: '#94a3b8', position: 'right' }}
          />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {ALLIANCE_DATA.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        DMK Alliance = DMK(54)+INC(4)+VCK(1)+CPI(3)+CPI(M)(1)+IUML(2) = 65
      </p>
    </ChartCard>
  );
}

export function TvkMajorityPathChart() {
  const data = [
    { label: 'TVK Won', seats: 106, fill: '#e855a8' },
    { label: 'Majority', seats: 118, fill: '#94a3b8' },
    { label: '+Close <1K', seats: 111, fill: '#fbbf24' },
    { label: '+All Close', seats: 145, fill: '#f97316' },
  ];
  return (
    <ChartCard title="TVK Path to Majority — What-If Scenarios">
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[95, 155]} />
          <Tooltip formatter={(v: number) => [`${v} seats`]} contentStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={118}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: '118', fontSize: 10, fill: '#94a3b8', position: 'right' }}
          />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">+Close &lt;1K:</span> If TVK had won 5
          seats lost by &lt;1,000 votes → 111 (still 7 short of majority)
        </p>
        <p>
          <span className="font-medium text-foreground">+All Close:</span> If TVK had won all 39
          seats lost by &lt;5,000 votes → 145 (27 over majority)
        </p>
      </div>
    </ChartCard>
  );
}

export function TvkCloseLossByPartyChart() {
  return (
    <ChartCard title="Close Losses by Winning Party (39 seats, <5K margin)">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={CLOSE_LOSS_BY_PARTY} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="party" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number) => [`${v} seats`]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {CLOSE_LOSS_BY_PARTY.map((entry) => (
              <Cell key={entry.party} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        DMK+ADMK together denied TVK majority — 33 of 39 close losses
      </p>
    </ChartCard>
  );
}
