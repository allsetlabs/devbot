/** Polling interval constants (milliseconds) */
export const POLL_INTERVALS = {
  schedulerActive: 2000,
  workflowActive: 2000,
  chatRunning: 1500,
  chatIdle: 5000,
} as const;

/** Preset options for scheduler max runs selection */
export const MAX_RUNS_PRESETS = [
  { label: '1', value: 1 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '25', value: 25 },
];

/** Interval options for scheduler frequency selection */
export const INTERVAL_OPTIONS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '6h', value: 360 },
  { label: '12h', value: 720 },
  { label: '24h', value: 1440 },
];
