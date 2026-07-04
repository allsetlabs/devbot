# 0014 — Remove Trading Feature

**Date**: 2026-07-03
**Status**: Accepted

## Context

A full trading feature was built for DevBot in a prior session: a `/trading` frontend route, a `trading_records` SQLite table, REST endpoints at `/api/trading/*`, a twice-daily market analysis system scheduler (Claude Opus + Robinhood MCP + TradingView MCP), and one-shot execution schedulers for individual buy/sell decisions scoped to a specific Robinhood account ("Agentic").

The user subsequently decided to remove the entire feature.

## Decision

All trading-related code was deleted:

- `backend/src/routes/trading.ts` — REST endpoints for trading data and records
- `backend/src/lib/db/schema.ts` — `trading_records` Drizzle table definition
- `backend/src/lib/db/init-core.ts` — `CREATE TABLE IF NOT EXISTS trading_records` SQL block
- `backend/src/lib/db/types.ts` — `TradingRecordRow` and `TradingRecordInsert` types
- `backend/src/lib/schedulers-seed.ts` — market analysis scheduler seed and `buildMarketAnalysisPrompt` function
- `backend/src/index.ts` — `tradingRouter` import and route mount removed
- `app/src/pages/TradingPage.tsx`, `TradingOverviewTab.tsx`, `TradingDecisionsTab.tsx`, `TradingRecordItem.tsx` — all deleted
- `app/src/types/index.ts` — `TradingRecord`, `TradingHolding`, `TradingData` interfaces removed
- `app/src/lib/api.ts` — trading API client functions removed
- `app/src/components/SlideNav.tsx` — Trading nav item removed
- ADRs 0011 and 0012 (which documented the hybrid persistence and one-shot scheduler patterns) were deleted along with the feature files

## Rationale

User-directed removal. The feature was complete and TypeScript-clean but the user chose not to ship it.

## Consequences

- The `trading_records` table definition is gone from schema and init; if `devbot.db` was ever initialized with the table present, the table will persist in the database file but be harmless (no code references it).
- The `devbot-market-analysis` scheduler record may still exist in `devbot.db` if DevBot was run after the feature was seeded. It can be deleted via the Scheduler UI.
- ADRs 0011 and 0012 are deleted; their sequence numbers are retired and should not be reused.
