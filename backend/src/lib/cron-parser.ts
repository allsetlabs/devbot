/**
 * Lightweight cron expression matcher.
 * Supports standard 5-field cron: minute hour day-of-month month day-of-week
 *
 * Special values: asterisk (any), ranges (1-5), lists (1,3,5), steps (asterisk/15)
 * No dependencies, pure TS.
 */

interface CronField {
  values: Set<number>;
  isWildcard: boolean;
}

function parseField(field: string, min: number, max: number): CronField {
  if (field === '*') {
    return { values: new Set(), isWildcard: true };
  }

  const values = new Set<number>();

  for (const part of field.split(',')) {
    const stepMatch = part.match(/^(\*|(\d+)-(\d+))\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[4], 10);
      const start = stepMatch[1] === '*' ? min : parseInt(stepMatch[2], 10);
      const end = stepMatch[1] === '*' ? max : parseInt(stepMatch[3], 10);
      for (let i = start; i <= end; i += step) {
        values.add(i);
      }
      continue;
    }

    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) {
        values.add(i);
      }
      continue;
    }

    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= min && num <= max) {
      values.add(num);
    }
  }

  return { values, isWildcard: false };
}

function fieldMatches(field: CronField, value: number): boolean {
  return field.isWildcard || field.values.has(value);
}

// Check if the given date matches a cron expression.
// Expression format: "minute hour day-of-month month day-of-week"
// Examples: "0 0 1 * *" (monthly), "30 9 * * 1-5" (weekdays 9:30)
export function matchesCronExpression(expression: string, date: Date = new Date()): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    console.error(`[Cron] Invalid expression (need 5 fields): "${expression}"`);
    return false;
  }

  const minute = parseField(parts[0], 0, 59);
  const hour = parseField(parts[1], 0, 23);
  const dayOfMonth = parseField(parts[2], 1, 31);
  const month = parseField(parts[3], 1, 12);
  const dayOfWeek = parseField(parts[4], 0, 6); // 0 = Sunday

  return (
    fieldMatches(minute, date.getMinutes()) &&
    fieldMatches(hour, date.getHours()) &&
    fieldMatches(dayOfMonth, date.getDate()) &&
    fieldMatches(month, date.getMonth() + 1) &&
    fieldMatches(dayOfWeek, date.getDay())
  );
}

/**
 * Get a human-readable description of a cron expression.
 */
export function describeCronExpression(expression: string): string {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return expression;

  const [minute, hour, dom, month, dow] = fields;

  if (minute === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every hour';
  }
  if (minute === '0' && hour === '0' && dom === '*' && month === '*' && dow === '*') {
    return 'Daily at midnight';
  }
  if (dom === '*' && month === '*' && dow === '1-5') {
    return `Weekdays at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dom === '*' && month === '*' && dow === '*') {
    if (hour.startsWith('*/')) {
      return `Every ${hour.slice(2)} hours`;
    }
    if (minute === '0') {
      return `Daily at ${hour}:00`;
    }
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  return expression;
}

/**
 * Calculate the next occurrence of a cron expression after a given date.
 * Searches up to 366 days ahead. Returns null if no match found.
 */
export function nextCronOccurrence(
  expression: string,
  after: Date = new Date()
): Date | null {
  const candidate = new Date(after);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1); // Start from the next minute

  const maxIterations = 366 * 24 * 60; // ~1 year of minutes
  for (let i = 0; i < maxIterations; i++) {
    if (matchesCronExpression(expression, candidate)) {
      return candidate;
    }
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}
