/**
 * Smart Scheduler API client
 *
 * Analytics, cost tracking, budget management, auto-adjust, and predictions.
 */

import { BACKEND_URL, authHeaders } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunMetric {
  id: string;
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

export interface BudgetSettings {
  id: string;
  type: 'budget_settings';
  daily_budget: number | null;
  weekly_budget: number | null;
  monthly_budget: number | null;
  alert_threshold: number;
  auto_pause_on_exceed: boolean;
  paused_task_ids: string[];
}

export interface AutoAdjustConfig {
  task_id: string;
  enabled: boolean;
  min_interval_minutes?: number;
  max_interval_minutes?: number;
  target_success_rate?: number;
  last_adjusted_at?: string | null;
  adjustment_history?: Array<{
    timestamp: string;
    old_interval: number;
    new_interval: number;
    reason: string;
  }>;
}

export interface FailurePattern {
  error_type: string;
  count: number;
  percentage: number;
  common_hours: number[];
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

export interface SchedulePrediction {
  task_id: string;
  task_name: string | null;
  recommendation: string;
  current_interval: number;
  suggested_interval: number | null;
  suggested_cron: string | null;
  confidence: number;
  reason: string;
  estimated_savings: number;
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

export interface CostHistory {
  total_cost: number;
  total_runs: number;
  avg_cost_per_run: number;
  period_days: number;
  daily: Array<{
    date: string;
    cost: number;
    runs: number;
    failures: number;
  }>;
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const smartSchedulerApi = {
  // Analytics
  getGlobalAnalytics: (): Promise<GlobalAnalytics> =>
    fetchApi('/api/smart-scheduler/analytics'),

  getTaskAnalytics: (taskId: string): Promise<TaskAnalytics> =>
    fetchApi(`/api/smart-scheduler/analytics/${taskId}`),

  // Budget
  getBudgetStatus: (): Promise<BudgetStatus> =>
    fetchApi('/api/smart-scheduler/budget'),

  updateBudget: (
    updates: Partial<Pick<BudgetSettings, 'daily_budget' | 'weekly_budget' | 'monthly_budget' | 'alert_threshold' | 'auto_pause_on_exceed'>>
  ): Promise<BudgetSettings> =>
    fetchApi('/api/smart-scheduler/budget', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  // Auto-Adjust
  getAutoAdjust: (taskId: string): Promise<AutoAdjustConfig> =>
    fetchApi(`/api/smart-scheduler/auto-adjust/${taskId}`),

  setAutoAdjust: (
    taskId: string,
    config: { enabled: boolean; min_interval_minutes?: number; max_interval_minutes?: number; target_success_rate?: number }
  ): Promise<AutoAdjustConfig> =>
    fetchApi(`/api/smart-scheduler/auto-adjust/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Insights
  getInsights: (): Promise<{ insights: string[] }> =>
    fetchApi('/api/smart-scheduler/insights'),

  // Costs
  getCostHistory: (options?: { task_id?: string; days?: number }): Promise<CostHistory> => {
    const params = new URLSearchParams();
    if (options?.task_id) params.set('task_id', options.task_id);
    if (options?.days) params.set('days', String(options.days));
    const qs = params.toString();
    return fetchApi(`/api/smart-scheduler/costs${qs ? `?${qs}` : ''}`);
  },

  // Raw metrics
  getMetrics: (options?: { task_id?: string; limit?: number }): Promise<RunMetric[]> => {
    const params = new URLSearchParams();
    if (options?.task_id) params.set('task_id', options.task_id);
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString();
    return fetchApi(`/api/smart-scheduler/metrics${qs ? `?${qs}` : ''}`);
  },
};
