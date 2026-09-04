import { ne } from 'drizzle-orm';
import { coreDb, event_sources } from './db/core.js';

// ============================================
// Default event sources to seed on first run
// ============================================

interface SeedSource {
  name: string;
  type: 'stock' | 'news' | 'weather';
  config: Record<string, unknown>;
  pollIntervalSeconds: number;
}

const DEFAULT_SOURCES: SeedSource[] = [
  // ---- Stock News ----
  {
    name: 'Stock Market News',
    type: 'news',
    config: { query: 'stock market S&P 500 Nasdaq', maxAgeDays: 1 },
    pollIntervalSeconds: 1800, // 30 min
  },

  // ---- Local News ----
  {
    name: 'Princeton TX Local News',
    type: 'news',
    config: { query: 'Princeton Texas local news', maxAgeDays: 1 },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- Weather — Dallas TX ----
  {
    name: 'Weather: Dallas TX',
    type: 'weather',
    config: { location: 'Dallas, TX', condition: 'daily_update' },
    pollIntervalSeconds: 10800, // 3 hr
  },

  // ---- Weather — Princeton TX ----
  {
    name: 'Weather: Princeton TX',
    type: 'weather',
    config: { location: 'Princeton, TX', condition: 'daily_update' },
    pollIntervalSeconds: 10800, // 3 hr
  },

  // ---- Weather — Texas (severe alerts) ----
  {
    name: 'Weather: Texas Severe Alert',
    type: 'weather',
    config: { location: 'Texas, US', condition: 'severe' },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- H1B News ----
  {
    name: 'H1B Visa News',
    type: 'news',
    config: { query: 'H1B visa 2025 2026 USCIS', maxAgeDays: 2 },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- H4 EAD News ----
  {
    name: 'H4 EAD News',
    type: 'news',
    config: { query: 'H4 EAD work authorization USCIS', maxAgeDays: 2 },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- US Indian NRI News ----
  {
    name: 'US Indian NRI News',
    type: 'news',
    config: { query: 'Indian NRI USA immigration news', maxAgeDays: 1 },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- TVK Party News ----
  {
    name: 'TVK Party Tamil Nadu News',
    type: 'news',
    config: { query: 'TVK party Tamil Nadu Vijay tamilagam vettri kazhagam', maxAgeDays: 1 },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- DMK News ----
  {
    name: 'DMK Party News',
    type: 'news',
    config: { query: 'DMK party Tamil Nadu Stalin', maxAgeDays: 1 },
    pollIntervalSeconds: 3600, // 1 hr
  },

  // ---- US-Iran War News ----
  {
    name: 'US Iran War News',
    type: 'news',
    config: { query: 'US Iran war conflict military', maxAgeDays: 1 },
    pollIntervalSeconds: 1800, // 30 min — higher priority for breaking news
  },
];

// ============================================
// Seeder — idempotent, skips existing names
// ============================================

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function seedEventSources(): Promise<void> {
  try {
    const existing = await coreDb
      .select({ name: event_sources.name })
      .from(event_sources)
      .where(ne(event_sources.status, 'deleted'));

    const existingNames = new Set(existing.map((r) => r.name));

    const toInsert = DEFAULT_SOURCES.filter((s) => !existingNames.has(s.name));

    if (toInsert.length === 0) {
      console.log('[SeedEventSources] All default event sources already present — skipping');
      return;
    }

    for (const source of toInsert) {
      await coreDb.insert(event_sources).values({
        id: generateId(),
        name: source.name,
        type: source.type,
        config: source.config,
        status: 'active',
        poll_interval_seconds: source.pollIntervalSeconds,
        created_by: 'seed',
        updated_by: 'seed',
      });
      console.log(`[SeedEventSources] Added: ${source.name}`);
    }

    console.log(`[SeedEventSources] Seeded ${toInsert.length} event source(s)`);
  } catch (err) {
    // Non-fatal — log and continue
    console.error('[SeedEventSources] Failed to seed event sources:', err);
  }
}
