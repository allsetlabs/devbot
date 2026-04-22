/** Format a date string for display (e.g., "Mar 5, 2:30 PM") */
export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a date string as relative time (e.g., "5m ago", "2h ago", "3d ago") */
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Format a future date as relative countdown (e.g., "in 5m", "in 2h 30m", "in 3d") */
export function formatRelativeFuture(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  if (Number.isNaN(diff)) return '';
  if (diff <= 0) return 'now';
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(diff / 3600000);
  const remainMins = Math.ceil((diff % 3600000) / 60000);
  if (hrs < 24) return remainMins > 0 ? `in ${hrs}h ${remainMins}m` : `in ${hrs}h`;
  const days = Math.floor(diff / 86400000);
  return `in ${days}d`;
}

/** Format a minute interval as compact string (e.g., 90 → "1h 30m") */
export function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Convert an ISO date string to a YYYY-MM-DD key */
export function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Round down to nearest multiple of 5 (e.g. 67.5→65, 84.9→80) */
export function roundToNearest5(n: number): number {
  return Math.floor(n / 5) * 5;
}

/** Convert an ISO string to a local time input value (HH:MM) */
export function toLocalTimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert an ISO string to a local datetime-local input value */
export function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Get current time as HH:MM string */
export function nowTimeValue(): string {
  return toLocalTimeValue(new Date().toISOString());
}

/** Get current date as YYYY-MM-DD string */
export function nowDateValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Format a date string as 12-hour time (e.g. "02:30 PM") */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format a date string as a friendly label with day name (e.g. "Mon · Today", "Tue · Mar 5") */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  if (d.toDateString() === today.toDateString()) return `${dayName} · Today`;
  if (d.toDateString() === yesterday.toDateString()) return `${dayName} · Yesterday`;
  const sameYear = d.getFullYear() === today.getFullYear();
  const dateLabel = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dayName} · ${dateLabel}`;
}

/** Format milliseconds as mm:ss (e.g. 125000 → "2:05") */
export function formatMsTimer(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Extract the first truthy error message from a list of potential Error values */
export function extractErrorMessage(...errors: unknown[]): string | null {
  for (const err of errors) {
    if (err instanceof Error) return err.message;
  }
  return null;
}

/** Estimate token count from text using rough approximation (~4 chars = 1 token) */
export function estimateTokens(text: string): number {
  // Claude's tokenizer is complex, but a rough rule is ~4 characters = 1 token
  // This includes spaces, punctuation, and special characters
  const charCount = text.length;
  return Math.ceil(charCount / 4);
}

/** Format input size with character and token estimate */
export function formatInputSize(text: string): string {
  const charCount = text.length;
  const tokenCount = estimateTokens(text);

  if (charCount === 0) return '';
  if (tokenCount > 1000) {
    return `${charCount} chars · ~${(tokenCount / 1000).toFixed(1)}k tokens`;
  }
  return `${charCount} chars · ~${tokenCount} tokens`;
}

/** Format pricing per token from price per million tokens */
export function formatPricePerToken(pricePerMillion: number): string {
  const pricePerToken = pricePerMillion / 1_000_000;
  if (pricePerToken < 0.000001) {
    return `$${(pricePerToken * 1_000_000).toFixed(2)}M`;
  }
  return `$${pricePerToken.toFixed(7)}`;
}

/** Format pricing breakdown showing input/output costs */
export function formatModelPricing(inputPrice: number, outputPrice: number): string {
  return `$${inputPrice}/1M in · $${outputPrice}/1M out`;
}

/** Generate a chat title from the first user message */
export function generateChatTitle(message: string, maxLength: number = 60): string {
  if (!message || typeof message !== 'string') return 'New Chat';

  // Remove file attachment references like [Attached file: ...]
  const cleaned = message.replace(/\s*\[Attached file: [^\]]+\]\s*/g, ' ').trim();

  // Extract first sentence (ends with . ? ! or newline)
  const firstSentence = cleaned.match(/^([^.!?\n]+[.!?]?)/)?.[1]?.trim();
  let title = firstSentence || cleaned;

  // Truncate to maxLength, breaking at word boundaries
  if (title.length > maxLength) {
    title = title.substring(0, maxLength);
    // Find the last space and trim there to avoid cutting off mid-word
    const lastSpace = title.lastIndexOf(' ');
    if (lastSpace > 0) {
      title = title.substring(0, lastSpace);
    }
  }

  // Remove trailing punctuation if it's just a period
  if (title.endsWith('.') && !title.match(/\w\.$/)) {
    title = title.slice(0, -1).trim();
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title || 'New Chat';
}
