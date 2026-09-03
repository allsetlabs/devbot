import { useState } from 'react';
import { Card, CardContent } from '@allsetlabs/forge/components/ui/card';
import { Button } from '@allsetlabs/forge/components/ui/button';
import { Input } from '@allsetlabs/forge/components/ui/input';
import { toast } from 'sonner';
import { smartSchedulerApi, type BudgetStatus } from '../lib/smartSchedulerApi';
import { Save, PiggyBank, AlertTriangle, Shield } from 'lucide-react';

function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

interface Props {
  budget: BudgetStatus;
  onRefresh: () => void;
}

export function SmartSchedulerBudget({ budget, onRefresh }: Props) {
  const [editing, setEditing] = useState(false);
  const [daily, setDaily] = useState(budget.settings?.daily_budget?.toString() ?? '');
  const [weekly, setWeekly] = useState(budget.settings?.weekly_budget?.toString() ?? '');
  const [monthly, setMonthly] = useState(budget.settings?.monthly_budget?.toString() ?? '');
  const [alertThreshold, setAlertThreshold] = useState(
    ((budget.settings?.alert_threshold ?? 0.8) * 100).toString()
  );
  const [autoPause, setAutoPause] = useState(budget.settings?.auto_pause_on_exceed ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await smartSchedulerApi.updateBudget({
        daily_budget: daily ? parseFloat(daily) : null,
        weekly_budget: weekly ? parseFloat(weekly) : null,
        monthly_budget: monthly ? parseFloat(monthly) : null,
        alert_threshold: parseFloat(alertThreshold) / 100,
        auto_pause_on_exceed: autoPause,
      });
      toast.success('Budget settings saved');
      setEditing(false);
      onRefresh();
    } catch (err) {
      toast.error('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const periods = [
    { label: 'Daily', spent: budget.daily_spent, limit: budget.settings?.daily_budget, pct: budget.daily_percent, remaining: budget.daily_remaining },
    { label: 'Weekly', spent: budget.weekly_spent, limit: budget.settings?.weekly_budget, pct: budget.weekly_percent, remaining: budget.weekly_remaining },
    { label: 'Monthly', spent: budget.monthly_spent, limit: budget.settings?.monthly_budget, pct: budget.monthly_percent, remaining: budget.monthly_remaining },
  ];

  return (
    <div className="space-y-4">
      {/* Spending Summary */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4" /> Spending
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : 'Edit Budget'}
            </Button>
          </div>

          {periods.map((p) => (
            <div key={p.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{p.label}</span>
                <span className="text-muted-foreground">
                  {formatCost(p.spent)}
                  {p.limit != null && ` / ${formatCost(p.limit)}`}
                </span>
              </div>
              {p.limit != null && (
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (p.pct ?? 0) >= 100
                        ? 'bg-red-500'
                        : (p.pct ?? 0) >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(p.pct ?? 0, 100)}%` }}
                  />
                </div>
              )}
              {p.remaining != null && (
                <p className="text-xs text-muted-foreground">
                  {formatCost(p.remaining)} remaining
                  {(p.pct ?? 0) >= 80 && (
                    <span className="ml-1 text-amber-500">
                      <AlertTriangle className="h-3 w-3 inline" /> {p.pct?.toFixed(0)}% used
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Budget Settings Editor */}
      {editing && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-sm font-medium">Budget Limits</h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Daily ($)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  min="0"
                  step="0.50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Weekly ($)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={weekly}
                  onChange={(e) => setWeekly(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Monthly ($)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  min="0"
                  step="5"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Alert at (%)</label>
              <Input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                min="0"
                max="100"
                step="5"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoPause}
                onChange={(e) => setAutoPause(e.target.checked)}
                className="rounded"
              />
              <Shield className="h-4 w-4 text-muted-foreground" />
              Auto-pause non-system schedulers when budget exceeded
            </label>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-1.5" size="sm">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Budget Settings'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
