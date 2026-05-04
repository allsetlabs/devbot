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

const SEAT_STATUS = [
  { name: 'Comfortable Win', value: 75, color: '#16a34a', description: '>10K margin' },
  { name: 'Close Win', value: 45, color: '#4ade80', description: '1K–10K margin' },
  { name: 'Close Contest', value: 32, color: '#facc15', description: 'Trailing within 10K' },
  { name: 'Trailing', value: 57, color: '#f97316', description: 'Behind by 10K–30K' },
  { name: 'Not Competitive', value: 25, color: '#ef4444', description: 'Behind by >30K' },
];

const PARTY_SEATS = [
  { party: 'TVK', seats: 120, fill: '#16a34a' },
  { party: 'AIADMK+', seats: 70, fill: '#f97316' },
  { party: 'DMK+', seats: 44, fill: '#3b82f6' },
];

const VOTE_SHARE = [
  { party: 'TVK', share: 32, fill: '#16a34a' },
  { party: 'DMK Alliance', share: 32, fill: '#3b82f6' },
  { party: 'AIADMK Bloc', share: 30, fill: '#f97316' },
  { party: 'Others', share: 6, fill: '#94a3b8' },
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function SeatStatusLegend() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-1">
      {SEAT_STATUS.map((s) => (
        <div key={s.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-foreground">{s.name}</span>
            <span className="text-xs text-muted-foreground">({s.description})</span>
          </div>
          <span className="text-xs font-medium text-foreground">{s.value} seats</span>
        </div>
      ))}
    </div>
  );
}

export function TvkSeatStatusChart() {
  return (
    <ChartCard title="TVK Seat Status (234 constituencies)">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={SEAT_STATUS}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {SEAT_STATUS.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} seats`, name]}
            contentStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <SeatStatusLegend />
    </ChartCard>
  );
}

export function PartySeatsChart() {
  return (
    <ChartCard title="Party-wise Seat Tally (234 total)">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={PARTY_SEATS} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="party" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 140]} />
          <Tooltip formatter={(v: number) => [`${v} seats`]} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {PARTY_SEATS.map((entry) => (
              <Cell key={entry.party} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <div className="h-0.5 w-12 bg-muted-foreground/40" />
        <span>Majority mark: 118</span>
        <div className="h-0.5 w-12 bg-muted-foreground/40" />
      </div>
    </ChartCard>
  );
}

export function VoteShareChart() {
  return (
    <ChartCard title="Vote Share (%)">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={VOTE_SHARE}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 60, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 40]} unit="%" />
          <YAxis type="category" dataKey="party" tick={{ fontSize: 11 }} width={70} />
          <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="share" radius={[0, 4, 4, 0]}>
            {VOTE_SHARE.map((entry) => (
              <Cell key={entry.party} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
