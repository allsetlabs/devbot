import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import type { GlobalAnalytics } from '../lib/smartSchedulerApi';
import { ChevronRight, ArrowUpDown } from 'lucide-react';

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

type SortKey = 'cost' | 'runs' | 'name';

export function SmartSchedulerCostTable({ analytics }: { analytics: GlobalAnalytics }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortKey>('cost');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const sorted = [...analytics.cost_by_task].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'cost') cmp = a.cost - b.cost;
    else if (sortBy === 'runs') cmp = a.runs - b.runs;
    else cmp = (a.task_name ?? '').localeCompare(b.task_name ?? '');
    return sortAsc ? cmp : -cmp;
  });

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No cost data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 border-b text-xs text-muted-foreground">
          <button className="text-left flex items-center gap-1" onClick={() => handleSort('name')}>
            Task {sortBy === 'name' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button className="text-right flex items-center gap-1" onClick={() => handleSort('runs')}>
            Runs {sortBy === 'runs' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <button className="text-right flex items-center gap-1" onClick={() => handleSort('cost')}>
            Cost {sortBy === 'cost' && <ArrowUpDown className="h-3 w-3" />}
          </button>
          <span />
        </div>

        {/* Rows */}
        {sorted.map((item) => {
          const pct = analytics.total_cost > 0 ? (item.cost / analytics.total_cost) * 100 : 0;
          return (
            <div
              key={item.task_id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 border-b last:border-b-0 items-center md:hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/scheduler/${item.task_id}`)}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.task_name || item.task_id}</p>
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">{item.runs}</span>
              <span className="text-sm font-medium tabular-nums">{formatCost(item.cost)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          );
        })}

        {/* Total */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-muted/30 text-sm font-medium">
          <span>Total</span>
          <span className="tabular-nums">{analytics.total_runs}</span>
          <span className="tabular-nums">{formatCost(analytics.total_cost)}</span>
          <span />
        </div>
      </CardContent>
    </Card>
  );
}
