import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import type { SchedulePrediction } from '../lib/smartSchedulerApi';
import {
  Lightbulb,
  ArrowDown,
  Clock,
  Cpu,
  TrendingDown,
} from 'lucide-react';

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.8) return { text: 'High', color: 'text-emerald-600' };
  if (c >= 0.6) return { text: 'Medium', color: 'text-amber-600' };
  return { text: 'Low', color: 'text-muted-foreground' };
}

function recommendationIcon(rec: string) {
  if (rec.includes('Downgrade')) return Cpu;
  if (rec.includes('interval')) return Clock;
  if (rec.includes('cron')) return Clock;
  return Lightbulb;
}

export function SmartSchedulerPredictions({
  predictions,
}: {
  predictions: SchedulePrediction[];
}) {
  if (predictions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No optimizations available yet.</p>
          <p className="text-xs mt-1">
            Run more tasks to generate scheduling and cost recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalSavings = predictions.reduce((sum, p) => sum + p.estimated_savings, 0);

  return (
    <div className="space-y-3">
      {/* Savings summary */}
      <Card>
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
            <TrendingDown className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {predictions.length} optimization{predictions.length !== 1 ? 's' : ''} found
            </p>
            <p className="text-xs text-muted-foreground">
              Potential savings: ~{formatCost(totalSavings)}/month
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Individual predictions */}
      {predictions.map((pred, i) => {
        const Icon = recommendationIcon(pred.recommendation);
        const conf = confidenceLabel(pred.confidence);
        return (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {pred.task_name || pred.task_id}
                    </p>
                    <p className="text-xs text-primary">{pred.recommendation}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs ${conf.color}`}>{conf.text}</span>
                  {pred.estimated_savings > 0 && (
                    <p className="text-xs text-emerald-600 flex items-center gap-0.5">
                      <ArrowDown className="h-3 w-3" />
                      {formatCost(pred.estimated_savings)}/mo
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{pred.reason}</p>

              {pred.suggested_interval && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Interval:</span>{' '}
                  {pred.current_interval}min → {pred.suggested_interval}min
                </p>
              )}
              {pred.suggested_cron && (
                <p className="text-xs">
                  <span className="text-muted-foreground">Cron:</span>{' '}
                  <code className="bg-muted px-1 rounded text-[11px]">{pred.suggested_cron}</code>
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
