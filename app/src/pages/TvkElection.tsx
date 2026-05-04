import { BarChart2, Menu, ExternalLink } from 'lucide-react';
import { Button } from '@allsetlabs/reusable/components/ui/button';
import { useNav } from '../hooks/useNav';
import {
  TvkWinLossChart,
  TvkMarginChart,
  PartySeatsChart,
  VoteShareChart,
} from '../components/TvkElectionCharts';

const MAJORITY_MARK = 118;
const TVK_SEATS = 106;
const TOTAL_SEATS = 234;
const SEATS_SHORT = MAJORITY_MARK - TVK_SEATS;

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
        Live trends — May 5, 2026 12:12 PM. Counting ongoing. Source: ECI official.
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
            sub="below majority (needs 12 more)"
            variant="danger"
          />
          <StatCard
            label="Total Assembly"
            value={TOTAL_SEATS.toString()}
            sub="Tamil Nadu seats"
          />
        </div>

        <TvkWinLossChart />
        <TvkMarginChart />
        <PartySeatsChart />
        <VoteShareChart />

        <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Data notes</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>All seat data from official ECI results page — updated 12:12 PM May 5, 2026.</li>
            <li>Margin breakdown computed from ECI constituency-wise results (106 TVK leads).</li>
            <li>TVK vote share appears under "Other (38.74%)" in ECI — reflects new party classification.</li>
            <li>Alliance: TVK solo (106), AIADMK+ ADMK+BJP (67), DMK alliance (54), Others PMK+DMDK+rest (7).</li>
            <li>TVK contested solo in all 234 constituencies — historic debut. Avg win margin: 5,629 votes.</li>
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
