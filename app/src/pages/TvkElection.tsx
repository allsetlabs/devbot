import { BarChart2, Menu, ExternalLink } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { useNav } from '../hooks/useNav';
import {
  TvkWinLossChart,
  TvkMarginChart,
  TvkWinsAtRiskChart,
  PartySeatsChart,
  VoteShareChart,
} from '../components/TvkElectionCharts';
import {
  TvkStatusBreakdown,
  TvkCloseRacesChart,
  TvkBeaterChart,
} from '../components/TvkCloseRaceCharts';
import {
  TvkAlliancePieChart,
  TvkAllianceBarChart,
  TvkMajorityPathChart,
  TvkCloseLossByPartyChart,
} from '../components/TvkInsightCharts';

const MAJORITY_MARK = 118;
const TVK_SEATS = 109;
const TOTAL_SEATS = 234;
const SEATS_SHORT = MAJORITY_MARK - TVK_SEATS;
const TVK_CLOSE_LOSSES = 27;
const TVK_NOT_COMPETITIVE = 98;

const DATA_SOURCE_URL = 'https://results.eci.gov.in/ResultAcGenMay2026/partywiseresult-S22.htm';

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  variant?: 'default' | 'success' | 'danger' | 'warn';
}

function StatCard({ label, value, sub, variant = 'default' }: StatCardProps) {
  const valueColor =
    variant === 'success'
      ? '#16a34a'
      : variant === 'danger'
        ? '#dc2626'
        : variant === 'warn'
          ? '#d97706'
          : undefined;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-3xl font-bold" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

export function TvkElection() {
  const { openNav } = useNav();

  return (
    <div className="safe-area-top safe-area-bottom flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Button variant="ghost" size="icon" onClick={openNav}>
          <Menu className="h-5 w-5" />
        </Button>
        <BarChart2 className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">TVK 2026</h1>
          <p className="text-xs text-muted-foreground">Tamil Nadu Assembly Election Results</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.open(DATA_SOURCE_URL, '_blank')}
          title="Official ECI Results"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </header>

      <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-600 dark:text-yellow-400">
        Counting update — May 4, 2026 (latest round). Source: ECI official (results.eci.gov.in). TVK 109 (22 Won+87 Leading) · DMK Alliance 73 · ADMK 44 · BJP 1.
      </div>

      <main className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="TVK Leading"
            value={TVK_SEATS.toString()}
            sub="of 234 constituencies"
            variant="success"
          />
          <StatCard
            label="Majority Mark"
            value={MAJORITY_MARK.toString()}
            sub="seats needed to form govt"
          />
          <StatCard
            label="Seats Short"
            value={`-${SEATS_SHORT}`}
            sub={`below majority (needs ${SEATS_SHORT} more)`}
            variant="danger"
          />
          <StatCard
            label="Close Losses"
            value={`~${TVK_CLOSE_LOSSES}`}
            sub="seats lost by <5K · Palani/Bargur/Cumbum flipped to losses · Polur 316!"
            variant="warn"
          />
          <StatCard
            label="Not Competitive"
            value={TVK_NOT_COMPETITIVE.toString()}
            sub="seats TVK couldn't challenge"
          />
          <StatCard
            label="Total Assembly"
            value={TOTAL_SEATS.toString()}
            sub="Tamil Nadu seats"
          />
        </div>

        <TvkStatusBreakdown />
        <TvkMajorityPathChart />
        <TvkWinsAtRiskChart />
        <TvkWinLossChart />
        <TvkAlliancePieChart />
        <TvkAllianceBarChart />
        <TvkMarginChart />
        <TvkCloseRacesChart />
        <TvkCloseLossByPartyChart />
        <TvkBeaterChart />
        <PartySeatsChart />
        <VoteShareChart />

        <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Data notes</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>Count data — May 4, 2026 (latest round). Counting in progress. Source: ECI (results.eci.gov.in).</li>
            <li>TVK leading/won 109 seats (22 officially won + 87 leading). 27 close losses (&lt;5K). ~98 not competitive.</li>
            <li>Key flips: Palani (TVK→ADMK+753) · Bargur (TVK→ADMK+882) · Cumbum (TVK→DMK+1596) vs previous round.</li>
            <li>Current risks: Polur 316 · Kovilpatti 329 · Kumbakonam 432 · Sholavandan recovered to 523 · Kulithalai 542.</li>
            <li>DMK Alliance at 73 seats (DMK 60+INC 5+VCK 2+CPI 2+CPI(M) 2+IUML 2). BJP dropped from 2→1 seat. ADMK 45→44.</li>
            <li>TVK vote share listed as "Other (39.19%)" in ECI — newly registered party classification.</li>
            <li>TVK contested all 234 seats solo — no alliance. Historic debut. 52 seats TVK not even in top 2.</li>
            <li>
              Official source:{' '}
              <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
                results.eci.gov.in
              </a>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
