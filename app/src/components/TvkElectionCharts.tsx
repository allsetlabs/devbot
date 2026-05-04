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
  ReferenceLine,
} from 'recharts';

// ECI final count — May 4, 2026 (8:00 PM)
// Source: results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm
// TVK: 69 Won + 37 Leading = 106 | DMK: 59 | ADMK: 47 | DMK Alliance: 72
// Polur FLIPPED to DMDK+67 · Kumbakonam TVK+535 (new riskiest)

const TVK_WIN_STATUS = [
  { name: 'TVK Leading/Won', value: 106, color: '#e855a8' },
  { name: 'Not Leading', value: 128, color: '#e2e8f0' },
];

// Margin breakdown for all 107 TVK leading/won seats (statewise data — 7:33 PM round)
// Polur 258 · Kumbakonam 432 · Kulithalai 560 · Manamadurai 637 · Kallakurichi 798
const TVK_MARGIN_DIST = [
  { range: '<1K', seats: 5, fill: '#facc15' },
  { range: '1K–3K', seats: 8, fill: '#86efac' },
  { range: '3K–5K', seats: 5, fill: '#4ade80' },
  { range: '5K–10K', seats: 12, fill: '#22c55e' },
  { range: '10K–20K', seats: 34, fill: '#16a34a' },
  { range: '>20K', seats: 43, fill: '#15803d' },
];

const ALL_PARTIES = [
  { party: 'TVK', seats: 106, fill: '#e855a8' },
  { party: 'DMK', seats: 59, fill: '#22c55e' },
  { party: 'ADMK', seats: 47, fill: '#a3731a' },
  { party: 'PMK', seats: 5, fill: '#65a30d' },
  { party: 'INC', seats: 5, fill: '#3b82f6' },
  { party: 'BJP', seats: 1, fill: '#f97316' },
  { party: 'IUML', seats: 2, fill: '#0284c7' },
  { party: 'CPI(M)', seats: 2, fill: '#b91c1c' },
  { party: 'VCK', seats: 2, fill: '#7c3aed' },
  { party: 'CPI', seats: 2, fill: '#dc2626' },
  { party: 'DMDK', seats: 2, fill: '#d97706' },
  { party: 'AMMK', seats: 1, fill: '#64748b' },
];

// ECI vote share — TVK appears under "Other" (new party classification)
const VOTE_SHARE = [
  { party: 'TVK*', share: 39.19, fill: '#e855a8' },
  { party: 'DMK', share: 24.04, fill: '#22c55e' },
  { party: 'ADMK', share: 21.87, fill: '#a3731a' },
  { party: 'NTK', share: 3.95, fill: '#475569' },
  { party: 'INC', share: 3.63, fill: '#3b82f6' },
  { party: 'BJP', share: 3.07, fill: '#f97316' },
  { party: 'DMDK', share: 1.10, fill: '#d97706' },
  { party: 'VCK', share: 1.04, fill: '#7c3aed' },
  { party: 'CPI', share: 0.60, fill: '#dc2626' },
  { party: 'CPI(M)', share: 0.59, fill: '#b91c1c' },
  { party: 'NOTA', share: 0.41, fill: '#94a3b8' },
  { party: 'IUML', share: 0.36, fill: '#0284c7' },
];

// 10 TVK-leading seats with smallest margins (most at risk) — 8:00 PM final
// Polur FLIPPED to DMDK+67 · Kumbakonam TVK+535 is now riskiest
const TVK_WINS_AT_RISK = [
  { name: 'Kumbakonam', margin: 535, fill: '#ef4444' },
  { name: 'Kulithalai', margin: 560, fill: '#ef4444' },
  { name: 'Cumbum', margin: 751, fill: '#ef4444' },
  { name: 'Kallakurichi', margin: 798, fill: '#ef4444' },
  { name: 'Manamadurai', margin: 895, fill: '#f97316' },
  { name: 'Srivaikuntam', margin: 1186, fill: '#f97316' },
  { name: 'Manapparai', margin: 1426, fill: '#fbbf24' },
  { name: 'Usilampatti', margin: 1805, fill: '#fbbf24' },
  { name: 'Modakkurichi', margin: 2430, fill: '#d97706' },
  { name: 'Tiruvadanai', margin: 2513, fill: '#d97706' },
];

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

export function TvkWinLossChart() {
  return (
    <ChartCard title="TVK Seat Status (234 constituencies) — May 4, 8:00 PM Final">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie
            data={TVK_WIN_STATUS}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {TVK_WIN_STATUS.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [`${v} seats`, n]}
            contentStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {TVK_WIN_STATUS.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <div>
              <div className="text-xs text-muted-foreground">{s.name}</div>
              <div className="text-lg font-bold text-foreground">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-center text-xs text-destructive">
        Majority needs <strong>118</strong> — TVK is <strong>12 seats short</strong> (69 Won + 37 Leading)
      </div>
    </ChartCard>
  );
}

export function TvkMarginChart() {
  return (
    <ChartCard title="TVK Winning Margins — 45 Seats Still Counting">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={TVK_MARGIN_DIST} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="range" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`${v} seats`]} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {TVK_MARGIN_DIST.map((entry) => (
              <Cell key={entry.range} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        106 TVK seats · 5 leads &lt;1K at risk · 69 officially Won · Polur FLIPPED to DMDK+67
      </p>
    </ChartCard>
  );
}

export function TvkWinsAtRiskChart() {
  return (
    <ChartCard title="TVK Wins at Risk — 10 Slimmest Leads (8:00 PM Final)">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={TVK_WINS_AT_RISK}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 110, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
          <Tooltip
            formatter={(v: number) => [`Leading by ${v} votes`]}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
            {TVK_WINS_AT_RISK.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        Red = extreme risk (&lt;1000) · Kumbakonam TVK+535 (riskiest) · Polur FLIPPED to DMDK+67
      </p>
    </ChartCard>
  );
}

export function PartySeatsChart() {
  return (
    <ChartCard title="Party-wise Seat Tally (234 total)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={ALL_PARTIES} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="party" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 120]} />
          <Tooltip formatter={(v: number) => [`${v} seats`]} contentStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={118}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: '118', fontSize: 10, fill: '#94a3b8', position: 'right' }}
          />
          <Bar dataKey="seats" radius={[4, 4, 0, 0]}>
            {ALL_PARTIES.map((entry) => (
              <Cell key={entry.party} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">Dashed line = majority mark (118 seats)</p>
    </ChartCard>
  );
}

export function VoteShareChart() {
  return (
    <ChartCard title="Vote Share (%) — ECI Official">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={VOTE_SHARE}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 54, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 45]} unit="%" />
          <YAxis type="category" dataKey="party" tick={{ fontSize: 11 }} width={54} />
          <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="share" radius={[0, 4, 4, 0]}>
            {VOTE_SHARE.map((entry) => (
              <Cell key={entry.party} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        * TVK classified as "Other" in ECI vote share — 39.19% ≈ 1.00Cr votes
      </p>
    </ChartCard>
  );
}
