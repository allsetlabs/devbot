import { Coins, ArrowDownToLine, ArrowUpFromLine, Database, Clock, Repeat, Zap } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@allsetlabs/reusable/components/ui/drawer';
import { formatTokens, formatCost, formatDuration, type UsageData } from './SystemMessage';

interface SessionCostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    totalTokens: number;
    totalCost: number;
    totalDuration: number;
    turnCount: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    perTurnUsage: UsageData[];
  };
}

export function SessionCostDrawer({ open, onOpenChange, stats }: SessionCostDrawerProps) {
  const cacheHitRate =
    stats.inputTokens > 0
      ? Math.round((stats.cacheReadTokens / (stats.inputTokens + stats.cacheReadTokens + stats.cacheCreationTokens)) * 100)
      : 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Session Cost Summary
          </DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Coins className="h-4 w-4 text-yellow-500" />}
              label="Total Cost"
              value={formatCost(stats.totalCost)}
              highlight
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-blue-500" />}
              label="Total Tokens"
              value={formatTokens(stats.totalTokens)}
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              label="Duration"
              value={stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : '—'}
            />
            <StatCard
              icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
              label="Turns"
              value={String(stats.turnCount)}
            />
          </div>

          {/* Token breakdown */}
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted-foreground">Token Breakdown</h3>
          <div className="space-y-2">
            <BreakdownRow
              icon={<ArrowDownToLine className="h-3.5 w-3.5 text-green-500" />}
              label="Input tokens"
              value={formatTokens(stats.inputTokens)}
            />
            <BreakdownRow
              icon={<ArrowUpFromLine className="h-3.5 w-3.5 text-blue-500" />}
              label="Output tokens"
              value={formatTokens(stats.outputTokens)}
            />
            <BreakdownRow
              icon={<Database className="h-3.5 w-3.5 text-purple-500" />}
              label="Cache read tokens"
              value={formatTokens(stats.cacheReadTokens)}
            />
            <BreakdownRow
              icon={<Database className="h-3.5 w-3.5 text-orange-500" />}
              label="Cache creation tokens"
              value={formatTokens(stats.cacheCreationTokens)}
            />
          </div>

          {/* Cache hit rate */}
          {stats.inputTokens > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted-foreground">Cache Hit Rate</h3>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${cacheHitRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground">{cacheHitRate}%</span>
              </div>
            </>
          )}

          {/* Per-turn breakdown */}
          {stats.perTurnUsage.length > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted-foreground">
                Per-Turn Usage ({stats.perTurnUsage.length})
              </h3>
              <div className="space-y-1">
                {stats.perTurnUsage.map((turn, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">Turn {i + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {formatTokens(turn.inputTokens + turn.outputTokens)} tok
                      </span>
                      {turn.costUsd > 0 && (
                        <span className="font-medium text-foreground">{formatCost(turn.costUsd)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className={`text-lg font-semibold ${highlight ? 'text-yellow-500' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function BreakdownRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
