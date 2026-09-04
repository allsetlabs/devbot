/**
 * Deep Research Plugin — shared frontend types.
 */

export interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  credibility_score: number;
  domain: string;
  fetched_at?: string;
  used_in_report: boolean;
  fetch_error?: string;
}

export interface ResearchStats {
  total_sources: number;
  sources_analyzed: number;
  queries_executed: number;
}

export interface ResearchSession {
  id: string;
  topic: string;
  description: string;
  strategy: 'breadth' | 'depth';
  status: 'queued' | 'researching' | 'compiling' | 'completed' | 'failed';
  queries: string[];
  sources: ResearchSource[];
  report: string;
  error: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  stats: ResearchStats;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  settings: Record<string, unknown>;
}

export interface ResearchSummaryStats {
  totalSessions: number;
  completed: number;
  inProgress: number;
  failed: number;
  queued: number;
  totalSources: number;
  totalQueries: number;
  avgDurationMs: number;
}
