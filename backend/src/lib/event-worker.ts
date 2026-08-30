import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { coreDb, event_sources, event_task_links, scheduled_tasks } from './db/core.js';
import type { EventSourceRow } from './db/types.js';

// ============================================
// Helpers
// ============================================

/** Fetch with a 5-second timeout */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Merge new keys into a source's settings column without clobbering existing keys */
async function updateSourceSettings(
  sourceId: string,
  newSettings: Record<string, unknown>
): Promise<void> {
  const rows = await coreDb
    .select({ settings: event_sources.settings })
    .from(event_sources)
    .where(eq(event_sources.id, sourceId))
    .limit(1);

  const existing =
    rows.length > 0 && rows[0].settings && typeof rows[0].settings === 'object'
      ? (rows[0].settings as Record<string, unknown>)
      : {};

  await coreDb
    .update(event_sources)
    .set({
      settings: { ...existing, ...newSettings },
      updated_by: 'event-worker',
    })
    .where(eq(event_sources.id, sourceId));
}

// ============================================
// Evaluator type & registry
// ============================================

type EventEvaluator = (
  config: Record<string, unknown>,
  source: EventSourceRow
) => Promise<{ triggered: boolean; details: string }>;

const evaluators: Record<string, EventEvaluator> = {
  // ------------------------------------------
  // Stock — Yahoo Finance (free, no key)
  // ------------------------------------------
  stock: async (config, source) => {
    const symbol = config.symbol as string | undefined;
    const condition = config.condition as string | undefined;
    const threshold = config.threshold as number | undefined;

    if (!symbol || !condition || threshold === undefined) {
      return { triggered: false, details: 'Missing required config: symbol, condition, threshold' };
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return { triggered: false, details: `Yahoo Finance API error: ${res.status} ${res.statusText}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const chart = data.chart as Record<string, unknown> | undefined;
    const results = (chart?.result as Array<Record<string, unknown>>) ?? [];
    if (results.length === 0) {
      return { triggered: false, details: `No chart data returned for ${symbol}` };
    }

    const meta = results[0].meta as Record<string, unknown>;
    const price = meta.regularMarketPrice as number;
    const previousClose = meta.chartPreviousClose as number | undefined;

    console.log(`[EventWorker] Stock ${symbol}: price=$${price}, previousClose=$${previousClose}`);

    // Persist latest price in settings
    await updateSourceSettings(source.id, {
      lastPrice: price,
      lastCheckedPrice: new Date().toISOString(),
    });

    let triggered = false;
    let details = '';

    switch (condition) {
      case 'above':
        triggered = price > threshold;
        details = `${symbol} price $${price} ${triggered ? '>' : '<='} threshold $${threshold}`;
        break;
      case 'below':
        triggered = price < threshold;
        details = `${symbol} price $${price} ${triggered ? '<' : '>='} threshold $${threshold}`;
        break;
      case 'change_pct': {
        if (!previousClose || previousClose === 0) {
          return {
            triggered: false,
            details: `No previous close data for ${symbol} to calculate % change`,
          };
        }
        const changePct = Math.abs(((price - previousClose) / previousClose) * 100);
        triggered = changePct > threshold;
        details = `${symbol} change ${changePct.toFixed(2)}% ${triggered ? '>' : '<='} threshold ${threshold}%`;
        break;
      }
      default:
        details = `Unknown condition: ${condition}`;
    }

    return { triggered, details };
  },

  // ------------------------------------------
  // Weather — Open-Meteo (free, no key)
  // ------------------------------------------
  weather: async (config, _source) => {
    const location = config.location as string | undefined;
    const condition = config.condition as string | undefined;
    const threshold = config.threshold as number | undefined;

    if (!location || !condition) {
      return { triggered: false, details: 'Missing required config: location, condition' };
    }

    // Step 1: geocode location
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geoRes = await fetchWithTimeout(geoUrl);
    if (!geoRes.ok) {
      return { triggered: false, details: `Geocoding API error: ${geoRes.status}` };
    }

    const geoData = (await geoRes.json()) as Record<string, unknown>;
    const geoResults = geoData.results as Array<Record<string, unknown>> | undefined;
    if (!geoResults || geoResults.length === 0) {
      return { triggered: false, details: `Location not found: ${location}` };
    }

    const lat = geoResults[0].latitude as number;
    const lon = geoResults[0].longitude as number;

    // Step 2: get current weather (temperature in Fahrenheit)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation&temperature_unit=fahrenheit`;
    const weatherRes = await fetchWithTimeout(weatherUrl);
    if (!weatherRes.ok) {
      return { triggered: false, details: `Weather API error: ${weatherRes.status}` };
    }

    const weatherData = (await weatherRes.json()) as Record<string, unknown>;
    const current = weatherData.current as Record<string, unknown>;
    const tempF = current.temperature_2m as number;
    const weatherCode = current.weather_code as number;
    const precipitation = current.precipitation as number;

    console.log(
      `[EventWorker] Weather ${location}: temp=${tempF}F, code=${weatherCode}, precip=${precipitation}mm`
    );

    // Rain codes: 51-67 (drizzle/rain), 80-82 (rain showers)
    const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
    // Snow codes: 71-77 (snow), 85-86 (snow showers)
    const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
    // Severe codes: 95-99 (thunderstorm)
    const SEVERE_CODES = new Set([95, 96, 99]);

    let triggered = false;
    let details = '';

    switch (condition) {
      case 'temp_above':
        if (threshold === undefined) {
          return { triggered: false, details: 'threshold required for temp_above' };
        }
        triggered = tempF > threshold;
        details = `${location}: ${tempF}F ${triggered ? '>' : '<='} ${threshold}F`;
        break;
      case 'temp_below':
        if (threshold === undefined) {
          return { triggered: false, details: 'threshold required for temp_below' };
        }
        triggered = tempF < threshold;
        details = `${location}: ${tempF}F ${triggered ? '<' : '>='} ${threshold}F`;
        break;
      case 'rain':
        triggered = RAIN_CODES.has(weatherCode);
        details = `${location}: weather_code=${weatherCode}, rain=${triggered ? 'yes' : 'no'}`;
        break;
      case 'snow':
        triggered = SNOW_CODES.has(weatherCode);
        details = `${location}: weather_code=${weatherCode}, snow=${triggered ? 'yes' : 'no'}`;
        break;
      case 'severe':
        triggered = SEVERE_CODES.has(weatherCode);
        details = `${location}: weather_code=${weatherCode}, severe=${triggered ? 'yes' : 'no'}`;
        break;
      default:
        details = `Unknown weather condition: ${condition}`;
    }

    return { triggered, details };
  },

  // ------------------------------------------
  // File Watch — fs.stat + readdir
  // ------------------------------------------
  file_watch: async (config, source) => {
    const watchPath = config.watchPath as string | undefined;
    const pattern = config.pattern as string | undefined;

    if (!watchPath) {
      return { triggered: false, details: 'Missing required config: watchPath' };
    }

    const settings = (source.settings ?? {}) as Record<string, unknown>;
    const storedMtimes = (settings.lastMtimes ?? {}) as Record<string, string>;

    let filesToCheck: string[] = [];

    try {
      const stat = await fs.stat(watchPath);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(watchPath);
        let filtered = entries;
        if (pattern) {
          const regex = globToRegex(pattern);
          filtered = entries.filter((e) => regex.test(e));
        }
        filesToCheck = filtered.map((e) => path.join(watchPath, e));
      } else {
        filesToCheck = [watchPath];
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { triggered: false, details: `Cannot access path ${watchPath}: ${message}` };
    }

    if (filesToCheck.length === 0) {
      return {
        triggered: false,
        details: `No files found at ${watchPath}${pattern ? ` matching ${pattern}` : ''}`,
      };
    }

    const changedFiles: string[] = [];
    const newMtimes: Record<string, string> = { ...storedMtimes };

    for (const filePath of filesToCheck) {
      try {
        const stat = await fs.stat(filePath);
        const mtime = stat.mtime.toISOString();
        const lastMtime = storedMtimes[filePath];

        if (!lastMtime || mtime > lastMtime) {
          changedFiles.push(filePath);
        }
        newMtimes[filePath] = mtime;
      } catch {
        // File may have been deleted between readdir and stat — skip
      }
    }

    // Persist updated mtimes
    await updateSourceSettings(source.id, { lastMtimes: newMtimes });

    const triggered = changedFiles.length > 0;
    const details = triggered
      ? `Changed files: ${changedFiles.join(', ')}`
      : `No changes detected in ${filesToCheck.length} file(s) at ${watchPath}`;

    console.log(`[EventWorker] FileWatch ${watchPath}: ${details}`);

    return { triggered, details };
  },

  // ------------------------------------------
  // News — stub (requires external API key)
  // ------------------------------------------
  news: async (config, _source) => {
    const keywords = config.keywords as string[] | undefined;
    console.log(
      `[EventWorker] News evaluator: requires external API key setup. Keywords: ${keywords?.join(', ') ?? 'none'}`
    );
    return {
      triggered: false,
      details:
        'News evaluator requires an external API key (e.g. NewsAPI). Not yet configured.',
    };
  },

  // ------------------------------------------
  // Webhook — triggered externally via API, not polled
  // ------------------------------------------
  webhook: async () => ({
    triggered: false,
    details: 'Webhooks are triggered externally via API, not polled.',
  }),

  // ------------------------------------------
  // Cron — handled by the scheduler worker directly
  // ------------------------------------------
  cron: async () => ({
    triggered: false,
    details: 'Cron is handled by the scheduler worker directly.',
  }),

  // ------------------------------------------
  // Custom — manual trigger only
  // ------------------------------------------
  custom: async () => ({
    triggered: false,
    details: 'Custom events are triggered manually.',
  }),
};

// ============================================
// Glob helper
// ============================================

/** Convert a simple glob pattern (with * and ?) to a RegExp */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

// ============================================
// Public evaluator (for test endpoint)
// ============================================

/**
 * Evaluate a single event source and return whether it would trigger.
 * Does NOT trigger linked tasks — used for dry-run testing.
 */
export async function evaluateEventSource(
  source: EventSourceRow
): Promise<{ triggered: boolean; details: string }> {
  const evaluator = evaluators[source.type];
  if (!evaluator) {
    return { triggered: false, details: `No evaluator for type: ${source.type}` };
  }

  const config = (
    typeof source.config === 'string' ? JSON.parse(source.config) : source.config ?? {}
  ) as Record<string, unknown>;

  return evaluator(config, source);
}

// ============================================
// Worker tick
// ============================================

let intervalId: ReturnType<typeof setInterval> | null = null;

async function tick(): Promise<void> {
  try {
    const sources = await coreDb
      .select()
      .from(event_sources)
      .where(eq(event_sources.status, 'active'));

    if (sources.length === 0) return;

    const now = new Date();

    for (const source of sources) {
      const lastChecked = source.last_checked_at ? new Date(source.last_checked_at) : null;
      const elapsedSeconds = lastChecked
        ? (now.getTime() - lastChecked.getTime()) / 1000
        : Infinity;

      if (elapsedSeconds < source.poll_interval_seconds) continue;

      // Update last_checked_at
      await coreDb
        .update(event_sources)
        .set({ last_checked_at: now.toISOString(), updated_by: 'event-worker' })
        .where(eq(event_sources.id, source.id));

      // Evaluate the event
      let result: { triggered: boolean; details: string };
      try {
        result = await evaluateEventSource(source);
      } catch (err) {
        console.error(
          `[EventWorker] Evaluator error for ${source.name} (${source.type}):`,
          err
        );
        continue;
      }

      if (!result.triggered) continue;

      console.log(
        `[EventWorker] Event triggered: ${source.name} (${source.type}) — ${result.details}`
      );

      // Update last_triggered_at
      await coreDb
        .update(event_sources)
        .set({ last_triggered_at: now.toISOString(), updated_by: 'event-worker' })
        .where(eq(event_sources.id, source.id));

      // Find linked tasks and set their next_run_at to now
      const links = await coreDb
        .select()
        .from(event_task_links)
        .where(eq(event_task_links.event_source_id, source.id));

      for (const link of links) {
        await coreDb
          .update(scheduled_tasks)
          .set({
            next_run_at: now.toISOString(),
            updated_by: 'event-worker',
          })
          .where(eq(scheduled_tasks.id, link.task_id));
        console.log(
          `[EventWorker] Triggered task ${link.task_id} from event source ${source.name}`
        );
      }
    }
  } catch (err) {
    console.error('[EventWorker] Tick error:', err);
  }
}

// ============================================
// Worker lifecycle
// ============================================

export function startEventWorker(): void {
  if (intervalId) {
    console.warn('[EventWorker] Already running');
    return;
  }

  console.log('[EventWorker] Starting event source polling (30s interval)');
  intervalId = setInterval(tick, 30_000);

  // Run first tick after a short delay to let DB initialize
  setTimeout(tick, 5_000);
}

export function stopEventWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[EventWorker] Stopped');
  }
}
