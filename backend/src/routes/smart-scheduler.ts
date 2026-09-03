/**
 * Smart Scheduler REST API
 *
 * Analytics, cost tracking, budget management, auto-adjust configuration,
 * and scheduling predictions.
 */

import { Router } from 'express';
import {
  getGlobalAnalytics,
  getTaskAnalytics,
  getBudgetStatus,
  updateBudgetSettings,
  setAutoAdjust,
  getAutoAdjustConfig,
  getInsights,
  metricsStore,
} from '../lib/smart-scheduler.js';
import { asyncHandler, sendNotFound, sendBadRequest } from '../lib/route-helpers.js';

export const smartSchedulerRouter = Router();

// ─── Global Analytics ────────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/analytics',
  asyncHandler(async (_req, res) => {
    const analytics = await getGlobalAnalytics();
    res.json(analytics);
  }, 'fetch global analytics')
);

// ─── Per-Task Analytics ──────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/analytics/:taskId',
  asyncHandler(async (req, res) => {
    const analytics = await getTaskAnalytics(req.params.taskId);
    if (!analytics) {
      sendNotFound(res, 'Task');
      return;
    }
    res.json(analytics);
  }, 'fetch task analytics')
);

// ─── Budget ──────────────────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/budget',
  asyncHandler(async (_req, res) => {
    const status = await getBudgetStatus();
    res.json(status);
  }, 'fetch budget status')
);

smartSchedulerRouter.put(
  '/budget',
  asyncHandler(async (req, res) => {
    const { daily_budget, weekly_budget, monthly_budget, alert_threshold, auto_pause_on_exceed } =
      req.body;

    const updates: Record<string, unknown> = {};

    if (daily_budget !== undefined) {
      if (daily_budget !== null && (typeof daily_budget !== 'number' || daily_budget < 0)) {
        sendBadRequest(res, 'daily_budget must be a positive number or null');
        return;
      }
      updates.daily_budget = daily_budget;
    }

    if (weekly_budget !== undefined) {
      if (weekly_budget !== null && (typeof weekly_budget !== 'number' || weekly_budget < 0)) {
        sendBadRequest(res, 'weekly_budget must be a positive number or null');
        return;
      }
      updates.weekly_budget = weekly_budget;
    }

    if (monthly_budget !== undefined) {
      if (monthly_budget !== null && (typeof monthly_budget !== 'number' || monthly_budget < 0)) {
        sendBadRequest(res, 'monthly_budget must be a positive number or null');
        return;
      }
      updates.monthly_budget = monthly_budget;
    }

    if (alert_threshold !== undefined) {
      if (typeof alert_threshold !== 'number' || alert_threshold < 0 || alert_threshold > 1) {
        sendBadRequest(res, 'alert_threshold must be between 0 and 1');
        return;
      }
      updates.alert_threshold = alert_threshold;
    }

    if (auto_pause_on_exceed !== undefined) {
      if (typeof auto_pause_on_exceed !== 'boolean') {
        sendBadRequest(res, 'auto_pause_on_exceed must be a boolean');
        return;
      }
      updates.auto_pause_on_exceed = auto_pause_on_exceed;
    }

    const result = await updateBudgetSettings(updates);
    res.json(result);
  }, 'update budget settings')
);

// ─── Auto-Adjust ─────────────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/auto-adjust/:taskId',
  asyncHandler(async (req, res) => {
    const config = await getAutoAdjustConfig(req.params.taskId);
    res.json(config ?? { enabled: false, task_id: req.params.taskId });
  }, 'fetch auto-adjust config')
);

smartSchedulerRouter.post(
  '/auto-adjust/:taskId',
  asyncHandler(async (req, res) => {
    const { enabled, min_interval_minutes, max_interval_minutes, target_success_rate } = req.body;

    if (typeof enabled !== 'boolean') {
      sendBadRequest(res, 'enabled is required and must be a boolean');
      return;
    }

    if (
      min_interval_minutes !== undefined &&
      (typeof min_interval_minutes !== 'number' || min_interval_minutes < 1)
    ) {
      sendBadRequest(res, 'min_interval_minutes must be a positive number');
      return;
    }

    if (
      max_interval_minutes !== undefined &&
      (typeof max_interval_minutes !== 'number' || max_interval_minutes < 1)
    ) {
      sendBadRequest(res, 'max_interval_minutes must be a positive number');
      return;
    }

    if (
      target_success_rate !== undefined &&
      (typeof target_success_rate !== 'number' || target_success_rate < 0 || target_success_rate > 1)
    ) {
      sendBadRequest(res, 'target_success_rate must be between 0 and 1');
      return;
    }

    const config = await setAutoAdjust(req.params.taskId, enabled, {
      min_interval_minutes,
      max_interval_minutes,
      target_success_rate,
    });

    res.json(config);
  }, 'update auto-adjust config')
);

// ─── Insights ────────────────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/insights',
  asyncHandler(async (_req, res) => {
    const insights = await getInsights();
    res.json({ insights });
  }, 'fetch insights')
);

// ─── Cost History ────────────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/costs',
  asyncHandler(async (req, res) => {
    const { task_id, days } = req.query;
    const daysLimit = days ? parseInt(days as string, 10) : 30;
    const cutoff = new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).toISOString();

    const allMetrics = await metricsStore.list({
      sort: 'created_at' as any,
      order: 'desc',
    });

    let filtered = allMetrics.filter((m) => m.started_at >= cutoff);
    if (task_id) {
      filtered = filtered.filter((m) => m.task_id === task_id);
    }

    const totalCost = filtered.reduce((sum, m) => sum + m.estimated_cost, 0);
    const totalRuns = filtered.length;
    const avgCostPerRun = totalRuns > 0 ? totalCost / totalRuns : 0;

    // Group by day
    const dayMap = new Map<string, { cost: number; runs: number; failures: number }>();
    for (const m of filtered) {
      const date = m.started_at.slice(0, 10);
      const day = dayMap.get(date) || { cost: 0, runs: 0, failures: 0 };
      day.cost += m.estimated_cost;
      day.runs++;
      if (m.status === 'failed') day.failures++;
      dayMap.set(date, day);
    }

    const daily = Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        cost: Number(data.cost.toFixed(4)),
        runs: data.runs,
        failures: data.failures,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      total_cost: Number(totalCost.toFixed(4)),
      total_runs: totalRuns,
      avg_cost_per_run: Number(avgCostPerRun.toFixed(4)),
      period_days: daysLimit,
      daily,
    });
  }, 'fetch cost history')
);

// ─── Metrics (raw) ──────────────────────────────────────────────────────

smartSchedulerRouter.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const { task_id, limit: limitStr } = req.query;
    const limit = limitStr ? parseInt(limitStr as string, 10) : 100;

    const options: Record<string, unknown> = {
      sort: 'created_at',
      order: 'desc',
      limit,
    };
    if (task_id) {
      (options as any).filter = { task_id };
    }

    const metrics = await metricsStore.list(options as any);
    res.json(metrics);
  }, 'fetch raw metrics')
);
