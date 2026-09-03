/**
 * Smart Scheduler — ML-based scheduling analytics engine
 *
 * Learns from past run patterns to auto-adjust intervals, predict optimal
 * run times, and track API costs per scheduler. Uses FileStore for budget
 * settings and run metrics persistence.
 */

import { eq, sql } from 'drizzle-orm';
import { coreDb, scheduled_tasks, task_runs, chat_messages } from './db/core.js';
import type { ScheduledTaskRow, SchedulerSettings } from './db/types.js';
import { FileStore, type FileStoreRecord } from './file-store.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = '/tmp/devbot/data';

/** Estimated cost per minute of Claude CLI execution by model (USD) */
const COST_PER_MINUTE: Record<string, number> = {
  opus: 0.90, // ~$15/M input + $75/M output, heavy usage
  sonnet: 0.18, // ~$3/M input + $15/M output
  haiku: 0.015, // ~$0.25/M input + $1.25/M output
};

/** Estimated cost per message (based on average token count) */
const COST_PER_MESSAGE: Record<string, number> = {
  opus: 0.045, // ~3K tokens avg per message exchange
  sonnet: 0.009,
  haiku: 0.00075,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunMetric extends FileStoreRecord {
  task_id: string;
  run_id: string;
  run_index: number;
  model: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  status: 'completed' | 'failed';
  message_count: number;
  estimated_cost: number;
  hour_of_day: number;
  day_of_week: number;
  error_type: string | null;
}

export interface BudgetSettings extends FileStoreRecord {
  type: 'budget_settings';
  daily_budget: number | null;
  weekly_budget: number | null;
  monthly_budget: number | null;
  alert_threshold: number; // 0.0 - 1.0, send alert when this % of budget is used
  auto_pause_on_exceed: boolean;
  paused_task_ids: string[];
}

export interface AutoAdjustConfig extends FileStoreRecord {
  type: 'auto_adjust';
  task_id: string;
  enabled: boolean;
  min_interval_minutes: number;
  max_interval_minutes: number;
  target_success_rate: number; // 0.0 - 1.0
  last_adjusted_at: string | null;
  adjustment_history: Array<{
    timestamp: string;
    old_interval: number;
    new_interval: number;
    reason: string;
  }>;
}

export interface TaskAnalytics {
  task_id: string;
  task_name: string | null;
  model: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  total_cost: number;
  avg_cost_per_run: number;
  avg_duration_seconds: number;
  median_duration_seconds: number;
  min_duration_seconds: number;
  max_duration_seconds: number;
  total_messages: number;
  cost_trend: 'increasing' | 'decreasing' | 'stable';
  optimal_hours: number[];
  worst_hours: number[];
  failure_patterns: FailurePattern[];
  last_7_days_cost: number;
  last_30_days_cost: number;
  auto_adjust: AutoAdjustConfig | null;
}

export interface FailurePattern {
  error_type: string;
  count: number;
  percentage: number;
  common_hours: number[];
}

export interface GlobalAnalytics {
  total_schedulers: number;
  active_schedulers: number;
  total_runs: number;
  total_cost: number;
  avg_success_rate: number;
  cost_by_model: Record<string, number>;
  cost_by_day: Array<{ date: string; cost: number; runs: number }>;
  cost_by_task: Array<{ task_id: string; task_name: string | null; cost: number; runs: number }>;
  busiest_hours: Array<{ hour: number; runs: number; avg_duration: number }>;
  budget: BudgetStatus;
  predictions: SchedulePrediction[];
}

export interface BudgetStatus {
  settings: BudgetSettings | null;
  daily_spent: number;
  weekly_spent: number;
  monthly_spent: number;
  daily_remaining: number | null;
  weekly_remaining: number | null;
  monthly_remaining: number | null;
  daily_percent: number | null;
  weekly_percent: number | null;
  monthly_percent: number | null;
}

export interface SchedulePrediction {
  task_id: string;
  task_name: string | null;
  recommendation: string;
  current_interval: number;
  suggested_interval: number | null;
  suggested_cron: string | null;
  confidence: number; // 0.0 - 1.0
  reason: string;
  estimated_savings: number;
}

// ---------------------------------------------------------------------------
// FileStores
// ---------------------------------------------------------------------------

const metricsStore = new FileStore<RunMetric>({
  filePath: `${DATA_DIR}/smart-scheduler-metrics.json`,
  name: 'smart-scheduler-metrics',
  autoCommit: false,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const configStore = new FileStore<any>({
  filePath: `${DATA_DIR}/smart-scheduler-config.json`,
  name: 'smart-scheduler-config',
  autoCommit: false,
});

// ---------------------------------------------------------------------------
// Cost Estimation
// ---------------------------------------------------------------------------

function estimateCost(model: string, durationSeconds: number, messageCount: number): number {
  const durationMinutes = durationSeconds / 60;
  const costPerMin = COST_PER_MINUTE[model] ?? COST_PER_MINUTE.sonnet;
  const costPerMsg = COST_PER_MESSAGE[model] ?? COST_PER_MESSAGE.sonnet;

  // Blend duration-based and message-based estimation
  const durationCost = durationMinutes * costPerMin;
  const messageCost = messageCount * costPerMsg;

  // Weight: 40% duration, 60% message-based (messages are a better proxy)
  return Number((durationCost * 0.4 + messageCost * 0.6).toFixed(4));
}

// ---------------------------------------------------------------------------
// Metrics Recording (called by scheduler-worker after each run)
// ---------------------------------------------------------------------------

export async function recordRunMetric(
  taskId: string,
  runId: string,
  runIndex: number,
  model: string,
  startedAt: string,
  completedAt: string,
  status: 'completed' | 'failed',
  errorMessage?: string | null
): Promise<void> {
  try {
    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(completedAt).getTime();
    const durationSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));

    // Count messages for this run's chat
    const run = coreDb
      .select()
      .from(task_runs)
      .where(eq(task_runs.id, runId))
      .get();

    let messageCount = 0;
    if (run?.chat_id) {
      const countResult = coreDb
        .select({ count: sql<number>`count(*)` })
        .from(chat_messages)
        .where(eq(chat_messages.chat_id, run.chat_id))
        .get();
      messageCount = countResult?.count ?? 0;
    }

    const cost = estimateCost(model, durationSeconds, messageCount);
    const startDate = new Date(startedAt);

    // Classify error type
    let errorType: string | null = null;
    if (errorMessage) {
      if (errorMessage.includes('timeout')) errorType = 'timeout';
      else if (errorMessage.includes('rate limit') || errorMessage.includes('429'))
        errorType = 'rate_limit';
      else if (errorMessage.includes('exit code')) errorType = 'process_error';
      else if (errorMessage.includes('ENOENT') || errorMessage.includes('not found'))
        errorType = 'not_found';
      else errorType = 'unknown';
    }

    await metricsStore.create({
      task_id: taskId,
      run_id: runId,
      run_index: runIndex,
      model,
      started_at: startedAt,
      completed_at: completedAt,
      duration_seconds: durationSeconds,
      status,
      message_count: messageCount,
      estimated_cost: cost,
      hour_of_day: startDate.getHours(),
      day_of_week: startDate.getDay(),
      error_type: errorType,
    } as Omit<RunMetric, 'id' | 'created_at' | 'updated_at'>);

    // Check budget after recording
    await checkBudgetAlerts();
  } catch (err) {
    console.error('[SmartScheduler] Failed to record run metric:', err);
  }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getTaskAnalytics(taskId: string): Promise<TaskAnalytics | null> {
  const task = coreDb
    .select()
    .from(scheduled_tasks)
    .where(eq(scheduled_tasks.id, taskId))
    .get();

  if (!task) return null;

  const allMetrics = await metricsStore.list({
    filter: { task_id: taskId } as Partial<RunMetric>,
    sort: 'created_at' as keyof RunMetric,
    order: 'desc',
  });

  const settings = task.settings as SchedulerSettings | null | undefined;
  const model = settings?.model || 'sonnet';

  if (allMetrics.length === 0) {
    return {
      task_id: taskId,
      task_name: task.name,
      model,
      total_runs: 0,
      successful_runs: 0,
      failed_runs: 0,
      success_rate: 0,
      total_cost: 0,
      avg_cost_per_run: 0,
      avg_duration_seconds: 0,
      median_duration_seconds: 0,
      min_duration_seconds: 0,
      max_duration_seconds: 0,
      total_messages: 0,
      cost_trend: 'stable',
      optimal_hours: [],
      worst_hours: [],
      failure_patterns: [],
      last_7_days_cost: 0,
      last_30_days_cost: 0,
      auto_adjust: null,
    };
  }

  const successful = allMetrics.filter((m) => m.status === 'completed');
  const failed = allMetrics.filter((m) => m.status === 'failed');
  const durations = successful.map((m) => m.duration_seconds).sort((a, b) => a - b);
  const totalCost = allMetrics.reduce((sum, m) => sum + m.estimated_cost, 0);
  const totalMessages = allMetrics.reduce((sum, m) => sum + m.message_count, 0);

  // Cost trend (compare first half vs second half)
  const half = Math.floor(allMetrics.length / 2);
  const recentCost =
    allMetrics.slice(0, half).reduce((sum, m) => sum + m.estimated_cost, 0) / Math.max(half, 1);
  const olderCost =
    allMetrics.slice(half).reduce((sum, m) => sum + m.estimated_cost, 0) /
    Math.max(allMetrics.length - half, 1);
  const costTrend =
    recentCost > olderCost * 1.15
      ? 'increasing'
      : recentCost < olderCost * 0.85
        ? 'decreasing'
        : 'stable';

  // Hour analysis — success rate by hour
  const hourStats = new Map<number, { total: number; success: number; avgDuration: number }>();
  for (const m of allMetrics) {
    const h = m.hour_of_day;
    const current = hourStats.get(h) || { total: 0, success: 0, avgDuration: 0 };
    current.total++;
    if (m.status === 'completed') {
      current.success++;
      current.avgDuration =
        (current.avgDuration * (current.success - 1) + m.duration_seconds) / current.success;
    }
    hourStats.set(h, current);
  }

  const hoursWithEnoughData = Array.from(hourStats.entries())
    .filter(([, s]) => s.total >= 2)
    .map(([hour, stats]) => ({
      hour,
      successRate: stats.success / stats.total,
      avgDuration: stats.avgDuration,
    }));

  const sortedBySuccess = [...hoursWithEnoughData].sort(
    (a, b) => b.successRate - a.successRate || a.avgDuration - b.avgDuration
  );
  const optimalHours = sortedBySuccess.slice(0, 3).map((h) => h.hour);
  const worstHours = sortedBySuccess
    .slice(-3)
    .reverse()
    .map((h) => h.hour);

  // Failure patterns
  const failureGroups = new Map<string, { count: number; hours: number[] }>();
  for (const m of failed) {
    const key = m.error_type || 'unknown';
    const group = failureGroups.get(key) || { count: 0, hours: [] };
    group.count++;
    group.hours.push(m.hour_of_day);
    failureGroups.set(key, group);
  }

  const failurePatterns: FailurePattern[] = Array.from(failureGroups.entries())
    .map(([error_type, data]) => ({
      error_type,
      count: data.count,
      percentage: Number(((data.count / allMetrics.length) * 100).toFixed(1)),
      common_hours: [...new Set(data.hours)].sort((a, b) => a - b),
    }))
    .sort((a, b) => b.count - a.count);

  // Recent costs
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const last7Cost = allMetrics
    .filter((m) => new Date(m.started_at).getTime() > sevenDaysAgo)
    .reduce((sum, m) => sum + m.estimated_cost, 0);
  const last30Cost = allMetrics
    .filter((m) => new Date(m.started_at).getTime() > thirtyDaysAgo)
    .reduce((sum, m) => sum + m.estimated_cost, 0);

  // Auto-adjust config
  const adjustConfigs = await configStore.list({
    filter: { type: 'auto_adjust', task_id: taskId } as Partial<AutoAdjustConfig>,
  });
  const autoAdjust = (adjustConfigs[0] as AutoAdjustConfig) ?? null;

  return {
    task_id: taskId,
    task_name: task.name,
    model,
    total_runs: allMetrics.length,
    successful_runs: successful.length,
    failed_runs: failed.length,
    success_rate: Number(((successful.length / allMetrics.length) * 100).toFixed(1)),
    total_cost: Number(totalCost.toFixed(4)),
    avg_cost_per_run: Number((totalCost / allMetrics.length).toFixed(4)),
    avg_duration_seconds: Math.round(
      durations.reduce((a, b) => a + b, 0) / Math.max(durations.length, 1)
    ),
    median_duration_seconds: durations[Math.floor(durations.length / 2)] ?? 0,
    min_duration_seconds: durations[0] ?? 0,
    max_duration_seconds: durations[durations.length - 1] ?? 0,
    total_messages: totalMessages,
    cost_trend: costTrend as 'increasing' | 'decreasing' | 'stable',
    optimal_hours: optimalHours,
    worst_hours: worstHours,
    failure_patterns: failurePatterns,
    last_7_days_cost: Number(last7Cost.toFixed(4)),
    last_30_days_cost: Number(last30Cost.toFixed(4)),
    auto_adjust: autoAdjust,
  };
}

export async function getGlobalAnalytics(): Promise<GlobalAnalytics> {
  const allTasks = coreDb
    .select()
    .from(scheduled_tasks)
    .where(sql`${scheduled_tasks.status} != 'deleted'`)
    .all();

  const activeTasks = allTasks.filter((t) => t.status === 'active');
  const allMetrics = await metricsStore.list({
    sort: 'created_at' as keyof RunMetric,
    order: 'desc',
  });

  const totalCost = allMetrics.reduce((sum, m) => sum + m.estimated_cost, 0);
  const successful = allMetrics.filter((m) => m.status === 'completed');
  const avgSuccessRate =
    allMetrics.length > 0
      ? Number(((successful.length / allMetrics.length) * 100).toFixed(1))
      : 0;

  // Cost by model
  const costByModel: Record<string, number> = {};
  for (const m of allMetrics) {
    costByModel[m.model] = (costByModel[m.model] || 0) + m.estimated_cost;
  }
  for (const key of Object.keys(costByModel)) {
    costByModel[key] = Number(costByModel[key].toFixed(4));
  }

  // Cost by day (last 30 days)
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentMetrics = allMetrics.filter(
    (m) => new Date(m.started_at).getTime() > thirtyDaysAgo
  );
  const dayMap = new Map<string, { cost: number; runs: number }>();
  for (const m of recentMetrics) {
    const date = m.started_at.slice(0, 10); // YYYY-MM-DD
    const day = dayMap.get(date) || { cost: 0, runs: 0 };
    day.cost += m.estimated_cost;
    day.runs++;
    dayMap.set(date, day);
  }
  const costByDay = Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      cost: Number(data.cost.toFixed(4)),
      runs: data.runs,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Cost by task
  const taskCostMap = new Map<string, { name: string | null; cost: number; runs: number }>();
  for (const m of allMetrics) {
    const existing = taskCostMap.get(m.task_id) || { name: null, cost: 0, runs: 0 };
    existing.cost += m.estimated_cost;
    existing.runs++;
    taskCostMap.set(m.task_id, existing);
  }
  // Fill in task names
  for (const task of allTasks) {
    const entry = taskCostMap.get(task.id);
    if (entry) entry.name = task.name;
  }
  const costByTask = Array.from(taskCostMap.entries())
    .map(([task_id, data]) => ({
      task_id,
      task_name: data.name,
      cost: Number(data.cost.toFixed(4)),
      runs: data.runs,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Busiest hours
  const hourMap = new Map<number, { runs: number; totalDuration: number }>();
  for (const m of allMetrics) {
    const h = m.hour_of_day;
    const entry = hourMap.get(h) || { runs: 0, totalDuration: 0 };
    entry.runs++;
    entry.totalDuration += m.duration_seconds;
    hourMap.set(h, entry);
  }
  const busiestHours = Array.from(hourMap.entries())
    .map(([hour, data]) => ({
      hour,
      runs: data.runs,
      avg_duration: Math.round(data.totalDuration / data.runs),
    }))
    .sort((a, b) => b.runs - a.runs);

  // Budget status
  const budget = await getBudgetStatus();

  // Predictions
  const predictions = await generatePredictions(allTasks, allMetrics);

  return {
    total_schedulers: allTasks.length,
    active_schedulers: activeTasks.length,
    total_runs: allMetrics.length,
    total_cost: Number(totalCost.toFixed(4)),
    avg_success_rate: avgSuccessRate,
    cost_by_model: costByModel,
    cost_by_day: costByDay,
    cost_by_task: costByTask,
    busiest_hours: busiestHours,
    budget,
    predictions,
  };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

async function getOrCreateBudgetSettings(): Promise<BudgetSettings> {
  const existing = await configStore.list({
    filter: { type: 'budget_settings' } as Partial<BudgetSettings>,
  });
  if (existing.length > 0) return existing[0] as BudgetSettings;

  const defaults = await configStore.create({
    type: 'budget_settings',
    daily_budget: null,
    weekly_budget: null,
    monthly_budget: null,
    alert_threshold: 0.8,
    auto_pause_on_exceed: false,
    paused_task_ids: [],
    created_by: 'system',
    updated_by: 'system',
    settings: {},
  });

  return defaults as BudgetSettings;
}

export async function getBudgetStatus(): Promise<BudgetStatus> {
  const budgetSettings = await getOrCreateBudgetSettings();
  const allMetrics = await metricsStore.list();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const dailySpent = allMetrics
    .filter((m) => new Date(m.started_at).getTime() >= todayStart.getTime())
    .reduce((sum, m) => sum + m.estimated_cost, 0);

  const weeklySpent = allMetrics
    .filter((m) => new Date(m.started_at).getTime() >= weekStart.getTime())
    .reduce((sum, m) => sum + m.estimated_cost, 0);

  const monthlySpent = allMetrics
    .filter((m) => new Date(m.started_at).getTime() >= monthStart.getTime())
    .reduce((sum, m) => sum + m.estimated_cost, 0);

  return {
    settings: budgetSettings,
    daily_spent: Number(dailySpent.toFixed(4)),
    weekly_spent: Number(weeklySpent.toFixed(4)),
    monthly_spent: Number(monthlySpent.toFixed(4)),
    daily_remaining: budgetSettings.daily_budget
      ? Number(Math.max(0, budgetSettings.daily_budget - dailySpent).toFixed(4))
      : null,
    weekly_remaining: budgetSettings.weekly_budget
      ? Number(Math.max(0, budgetSettings.weekly_budget - weeklySpent).toFixed(4))
      : null,
    monthly_remaining: budgetSettings.monthly_budget
      ? Number(Math.max(0, budgetSettings.monthly_budget - monthlySpent).toFixed(4))
      : null,
    daily_percent: budgetSettings.daily_budget
      ? Number(((dailySpent / budgetSettings.daily_budget) * 100).toFixed(1))
      : null,
    weekly_percent: budgetSettings.weekly_budget
      ? Number(((weeklySpent / budgetSettings.weekly_budget) * 100).toFixed(1))
      : null,
    monthly_percent: budgetSettings.monthly_budget
      ? Number(((monthlySpent / budgetSettings.monthly_budget) * 100).toFixed(1))
      : null,
  };
}

export async function updateBudgetSettings(
  updates: Partial<
    Pick<
      BudgetSettings,
      'daily_budget' | 'weekly_budget' | 'monthly_budget' | 'alert_threshold' | 'auto_pause_on_exceed'
    >
  >
): Promise<BudgetSettings> {
  const current = await getOrCreateBudgetSettings();
  const updated = await configStore.update(current.id, {
    ...updates,
    updated_by: 'user',
  });
  return updated as BudgetSettings;
}

async function checkBudgetAlerts(): Promise<void> {
  try {
    const budget = await getBudgetStatus();
    if (!budget.settings) return;

    const { auto_pause_on_exceed } = budget.settings;

    // Check if any budget threshold is exceeded
    const exceeded =
      (budget.daily_percent !== null && budget.daily_percent >= 100) ||
      (budget.weekly_percent !== null && budget.weekly_percent >= 100) ||
      (budget.monthly_percent !== null && budget.monthly_percent >= 100);

    if (exceeded && auto_pause_on_exceed) {
      // Pause non-system active schedulers
      const activeTasks = coreDb
        .select()
        .from(scheduled_tasks)
        .where(eq(scheduled_tasks.status, 'active'))
        .all();

      const pausedIds: string[] = [];
      for (const task of activeTasks) {
        const taskSettings = task.settings as SchedulerSettings | null | undefined;
        if (taskSettings?.isSystem) continue; // Don't pause system tasks

        coreDb
          .update(scheduled_tasks)
          .set({
            status: 'paused',
            updated_by: 'smart-scheduler',
            updated_at: new Date().toISOString(),
          })
          .where(eq(scheduled_tasks.id, task.id))
          .run();
        pausedIds.push(task.id);
      }

      if (pausedIds.length > 0) {
        console.log(
          `[SmartScheduler] Budget exceeded — paused ${pausedIds.length} schedulers: ${pausedIds.join(', ')}`
        );
        // Update budget settings with paused task IDs for later resume
        await configStore.update(budget.settings.id, {
          paused_task_ids: [...new Set([...(budget.settings.paused_task_ids || []), ...pausedIds])],
        });
      }
    }
  } catch (err) {
    console.error('[SmartScheduler] Budget alert check failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Auto-Adjust
// ---------------------------------------------------------------------------

export async function getAutoAdjustConfig(taskId: string): Promise<AutoAdjustConfig | null> {
  const configs = await configStore.list({
    filter: { type: 'auto_adjust', task_id: taskId } as Partial<AutoAdjustConfig>,
  });
  return (configs[0] as AutoAdjustConfig) ?? null;
}

export async function setAutoAdjust(
  taskId: string,
  enabled: boolean,
  options?: {
    min_interval_minutes?: number;
    max_interval_minutes?: number;
    target_success_rate?: number;
  }
): Promise<AutoAdjustConfig> {
  const existing = await getAutoAdjustConfig(taskId);

  if (existing) {
    const updated = await configStore.update(existing.id, {
      enabled,
      ...(options?.min_interval_minutes !== undefined && {
        min_interval_minutes: options.min_interval_minutes,
      }),
      ...(options?.max_interval_minutes !== undefined && {
        max_interval_minutes: options.max_interval_minutes,
      }),
      ...(options?.target_success_rate !== undefined && {
        target_success_rate: options.target_success_rate,
      }),
      updated_by: 'user',
    });
    return updated as AutoAdjustConfig;
  }

  const task = coreDb
    .select()
    .from(scheduled_tasks)
    .where(eq(scheduled_tasks.id, taskId))
    .get();

  const created = await configStore.create({
    type: 'auto_adjust',
    task_id: taskId,
    enabled,
    min_interval_minutes: options?.min_interval_minutes ?? 15,
    max_interval_minutes: options?.max_interval_minutes ?? (task?.interval_minutes
      ? task.interval_minutes * 4
      : 1440),
    target_success_rate: options?.target_success_rate ?? 0.9,
    last_adjusted_at: null,
    adjustment_history: [],
  } as Omit<AutoAdjustConfig, keyof FileStoreRecord>);

  return created as AutoAdjustConfig;
}

/**
 * Evaluate and apply auto-adjustments for a task based on recent performance.
 * Called after each run completes.
 */
export async function evaluateAutoAdjust(taskId: string): Promise<void> {
  try {
    const config = await getAutoAdjustConfig(taskId);
    if (!config || !config.enabled) return;

    const metrics = await metricsStore.list({
      filter: { task_id: taskId } as Partial<RunMetric>,
      sort: 'created_at' as keyof RunMetric,
      order: 'desc',
      limit: 20, // Look at last 20 runs
    });

    if (metrics.length < 5) return; // Need at least 5 runs for meaningful analysis

    const task = coreDb
      .select()
      .from(scheduled_tasks)
      .where(eq(scheduled_tasks.id, taskId))
      .get();
    if (!task || task.trigger_type === 'cron' || task.trigger_type === 'once') return;

    const recentSuccessRate = metrics.filter((m) => m.status === 'completed').length / metrics.length;
    const currentInterval = task.interval_minutes;
    let newInterval = currentInterval;
    let reason = '';

    // If success rate is below target, increase interval (give more breathing room)
    if (recentSuccessRate < config.target_success_rate) {
      newInterval = Math.min(
        config.max_interval_minutes,
        Math.round(currentInterval * 1.25)
      );
      reason = `Success rate ${(recentSuccessRate * 100).toFixed(0)}% below target ${(config.target_success_rate * 100).toFixed(0)}% — increased interval`;
    }
    // If success rate is high and runs are fast, we can decrease interval
    else if (recentSuccessRate >= 0.95) {
      const avgDuration = metrics
        .filter((m) => m.status === 'completed')
        .reduce((sum, m) => sum + m.duration_seconds, 0) / metrics.filter((m) => m.status === 'completed').length;

      // If average run takes less than 20% of the interval, we can safely reduce
      const intervalSeconds = currentInterval * 60;
      if (avgDuration < intervalSeconds * 0.2 && currentInterval > config.min_interval_minutes) {
        newInterval = Math.max(
          config.min_interval_minutes,
          Math.round(currentInterval * 0.85)
        );
        reason = `High success rate (${(recentSuccessRate * 100).toFixed(0)}%) with fast runs (avg ${Math.round(avgDuration)}s) — decreased interval`;
      }
    }

    // Apply adjustment if changed
    if (newInterval !== currentInterval) {
      coreDb
        .update(scheduled_tasks)
        .set({
          interval_minutes: newInterval,
          next_run_at: new Date(
            Date.now() + newInterval * 60 * 1000
          ).toISOString(),
          updated_by: 'smart-scheduler',
          updated_at: new Date().toISOString(),
        })
        .where(eq(scheduled_tasks.id, taskId))
        .run();

      const history = config.adjustment_history || [];
      history.unshift({
        timestamp: new Date().toISOString(),
        old_interval: currentInterval,
        new_interval: newInterval,
        reason,
      });

      await configStore.update(config.id, {
        last_adjusted_at: new Date().toISOString(),
        adjustment_history: history.slice(0, 50), // Keep last 50 adjustments
      });

      console.log(
        `[SmartScheduler] Auto-adjusted task ${taskId}: ${currentInterval}min → ${newInterval}min (${reason})`
      );
    }
  } catch (err) {
    console.error(`[SmartScheduler] Auto-adjust evaluation failed for ${taskId}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Predictions
// ---------------------------------------------------------------------------

async function generatePredictions(
  tasks: ScheduledTaskRow[],
  metrics: RunMetric[]
): Promise<SchedulePrediction[]> {
  const predictions: SchedulePrediction[] = [];

  for (const task of tasks) {
    if (task.status === 'deleted') continue;

    const taskMetrics = metrics.filter((m) => m.task_id === task.id);
    if (taskMetrics.length < 3) continue; // Need enough data

    const settings = task.settings as SchedulerSettings | null | undefined;
    const model = settings?.model || 'sonnet';
    const successRate =
      taskMetrics.filter((m) => m.status === 'completed').length / taskMetrics.length;
    const avgCost =
      taskMetrics.reduce((sum, m) => sum + m.estimated_cost, 0) / taskMetrics.length;
    const avgDuration =
      taskMetrics
        .filter((m) => m.status === 'completed')
        .reduce((sum, m) => sum + m.duration_seconds, 0) /
      Math.max(taskMetrics.filter((m) => m.status === 'completed').length, 1);

    // Recommendation: downgrade model if runs are simple
    if (model === 'opus' && avgDuration < 120 && successRate > 0.9) {
      const savingsPerRun = avgCost * 0.8; // ~80% savings from opus → sonnet
      predictions.push({
        task_id: task.id,
        task_name: task.name,
        recommendation: 'Downgrade to Sonnet',
        current_interval: task.interval_minutes,
        suggested_interval: null,
        suggested_cron: null,
        confidence: 0.75,
        reason: `Runs complete quickly (avg ${Math.round(avgDuration)}s) with ${(successRate * 100).toFixed(0)}% success — Sonnet would be cheaper`,
        estimated_savings: Number((savingsPerRun * 30).toFixed(2)), // Monthly savings estimate
      });
    }

    // Recommendation: increase interval if too frequent with high success rate
    if (
      task.trigger_type === 'interval' &&
      successRate > 0.95 &&
      task.interval_minutes < 60
    ) {
      const currentMonthlyRuns = (30 * 24 * 60) / task.interval_minutes;
      const suggestedInterval = Math.min(task.interval_minutes * 2, 120);
      const newMonthlyRuns = (30 * 24 * 60) / suggestedInterval;
      const savings = (currentMonthlyRuns - newMonthlyRuns) * avgCost;

      predictions.push({
        task_id: task.id,
        task_name: task.name,
        recommendation: 'Increase run interval',
        current_interval: task.interval_minutes,
        suggested_interval: suggestedInterval,
        suggested_cron: null,
        confidence: 0.65,
        reason: `High success rate (${(successRate * 100).toFixed(0)}%) suggests less frequent runs would suffice`,
        estimated_savings: Number(savings.toFixed(2)),
      });
    }

    // Recommendation: switch to cron if optimal hours are clustered
    if (task.trigger_type === 'interval' && taskMetrics.length >= 10) {
      const hourSuccess = new Map<number, { total: number; success: number }>();
      for (const m of taskMetrics) {
        const h = m.hour_of_day;
        const entry = hourSuccess.get(h) || { total: 0, success: 0 };
        entry.total++;
        if (m.status === 'completed') entry.success++;
        hourSuccess.set(h, entry);
      }

      // Find hours with significantly better success rates
      const goodHours = Array.from(hourSuccess.entries())
        .filter(([, s]) => s.total >= 2 && s.success / s.total > 0.9)
        .map(([h]) => h)
        .sort((a, b) => a - b);

      if (goodHours.length > 0 && goodHours.length <= 6 && successRate < 0.85) {
        const cronHours = goodHours.join(',');
        predictions.push({
          task_id: task.id,
          task_name: task.name,
          recommendation: 'Switch to cron schedule',
          current_interval: task.interval_minutes,
          suggested_interval: null,
          suggested_cron: `0 ${cronHours} * * *`,
          confidence: 0.6,
          reason: `Success rate peaks at hours ${goodHours.join(', ')} — cron schedule would avoid failure-prone times`,
          estimated_savings: Number(
            (avgCost * taskMetrics.filter((m) => m.status === 'failed').length * 0.5).toFixed(2)
          ),
        });
      }
    }
  }

  return predictions.sort((a, b) => b.estimated_savings - a.estimated_savings);
}

// ---------------------------------------------------------------------------
// Insights (human-readable summary)
// ---------------------------------------------------------------------------

export async function getInsights(): Promise<string[]> {
  const analytics = await getGlobalAnalytics();
  const insights: string[] = [];

  if (analytics.total_runs === 0) {
    insights.push('No scheduler runs recorded yet. Run some tasks to start seeing insights.');
    return insights;
  }

  // Cost insights
  if (analytics.total_cost > 0) {
    const topModel = Object.entries(analytics.cost_by_model).sort((a, b) => b[1] - a[1])[0];
    if (topModel) {
      insights.push(
        `${topModel[0]} accounts for $${topModel[1].toFixed(2)} of your total $${analytics.total_cost.toFixed(2)} spend.`
      );
    }
  }

  // Success rate insights
  if (analytics.avg_success_rate < 80) {
    insights.push(
      `⚠️ Overall success rate is ${analytics.avg_success_rate}% — consider reviewing failing tasks.`
    );
  } else if (analytics.avg_success_rate >= 95) {
    insights.push(
      `✅ Excellent ${analytics.avg_success_rate}% success rate across all schedulers.`
    );
  }

  // Busiest hour
  if (analytics.busiest_hours.length > 0) {
    const busiest = analytics.busiest_hours[0];
    insights.push(
      `Peak activity at ${busiest.hour}:00 with ${busiest.runs} runs (avg ${Math.round(busiest.avg_duration / 60)}min duration).`
    );
  }

  // Budget insights
  if (analytics.budget.settings?.monthly_budget) {
    const pct = analytics.budget.monthly_percent ?? 0;
    if (pct > 80) {
      insights.push(
        `🔴 Monthly budget ${pct}% used ($${analytics.budget.monthly_spent.toFixed(2)} / $${analytics.budget.settings.monthly_budget.toFixed(2)}).`
      );
    } else if (pct > 50) {
      insights.push(
        `🟡 Monthly budget ${pct}% used with $${analytics.budget.monthly_remaining?.toFixed(2)} remaining.`
      );
    }
  }

  // Cost savings opportunities
  if (analytics.predictions.length > 0) {
    const totalSavings = analytics.predictions.reduce((s, p) => s + p.estimated_savings, 0);
    insights.push(
      `💡 ${analytics.predictions.length} optimization${analytics.predictions.length > 1 ? 's' : ''} available — potential savings of ~$${totalSavings.toFixed(2)}/month.`
    );
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Exports for scheduler-worker integration
// ---------------------------------------------------------------------------

export { metricsStore, configStore };
