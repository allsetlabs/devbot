import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateTime,
  formatRelativeTime,
  formatInterval,
  toDateKey,
  roundToNearest5,
  toLocalTimeValue,
  toLocalDatetimeValue,
  nowTimeValue,
  nowDateValue,
  formatTime,
  formatDateLabel,
  formatMsTimer,
  extractErrorMessage,
  estimateTokens,
  formatInputSize,
  formatPricePerToken,
  formatModelPricing,
  generateChatTitle,
} from './format';

// Fixed point in time used for mocking: 2024-03-05T14:30:00.000Z
// In UTC this is 14:30 on March 5, 2024 (Tuesday)
const FIXED_NOW = new Date('2024-03-05T14:30:00.000Z').getTime();

describe('formatDateTime', () => {
  it('returns Never for null', () => {
    expect(formatDateTime(null)).toBe('Never');
  });

  it('returns Never for empty string', () => {
    expect(formatDateTime('')).toBe('Never');
  });

  it('returns a non-empty locale string for a valid date', () => {
    const result = formatDateTime('2024-03-05T14:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('Never');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Just now for less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date(FIXED_NOW - 30_000).toISOString();
    expect(formatRelativeTime(thirtySecondsAgo)).toBe('Just now');
  });

  it('returns Just now for exactly 0 seconds ago', () => {
    const now = new Date(FIXED_NOW).toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns Xm ago for 1-59 minutes ago', () => {
    const fiveMinutesAgo = new Date(FIXED_NOW - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns 59m ago for 59 minutes ago', () => {
    const fiftyNineMinutesAgo = new Date(FIXED_NOW - 59 * 60_000).toISOString();
    expect(formatRelativeTime(fiftyNineMinutesAgo)).toBe('59m ago');
  });

  it('returns 1m ago for exactly 1 minute ago', () => {
    const oneMinuteAgo = new Date(FIXED_NOW - 60_000).toISOString();
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1m ago');
  });

  it('returns Xh ago for 1-23 hours ago', () => {
    const twoHoursAgo = new Date(FIXED_NOW - 2 * 3_600_000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('returns 23h ago for 23 hours ago', () => {
    const twentyThreeHoursAgo = new Date(FIXED_NOW - 23 * 3_600_000).toISOString();
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('returns Xd ago for 24+ hours ago', () => {
    const threeDaysAgo = new Date(FIXED_NOW - 3 * 86_400_000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns 1d ago for exactly 24 hours ago', () => {
    const oneDayAgo = new Date(FIXED_NOW - 24 * 3_600_000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
  });
});

describe('formatInterval', () => {
  it('returns Xm for less than 60 minutes', () => {
    expect(formatInterval(45)).toBe('45m');
  });

  it('returns 0m for zero minutes', () => {
    expect(formatInterval(0)).toBe('0m');
  });

  it('returns 1m for 1 minute', () => {
    expect(formatInterval(1)).toBe('1m');
  });

  it('returns 59m for 59 minutes', () => {
    expect(formatInterval(59)).toBe('59m');
  });

  it('returns Xh for exact hours with no remainder', () => {
    expect(formatInterval(60)).toBe('1h');
    expect(formatInterval(120)).toBe('2h');
  });

  it('returns Xh Ym for hours with minutes remainder', () => {
    expect(formatInterval(90)).toBe('1h 30m');
    expect(formatInterval(75)).toBe('1h 15m');
  });

  it('returns correct format for large values', () => {
    expect(formatInterval(1440)).toBe('24h');
    expect(formatInterval(1441)).toBe('24h 1m');
  });
});

describe('toDateKey', () => {
  it('extracts local YYYY-MM-DD from an ISO string', () => {
    // Use a date where local time is unambiguous in the test environment
    const d = new Date(2024, 2, 5, 10, 0, 0); // March 5, 2024, 10:00 local
    const result = toDateKey(d.toISOString());
    expect(result).toBe('2024-03-05');
  });

  it('pads month and day with leading zeros', () => {
    const d = new Date(2024, 0, 9, 12, 0, 0); // Jan 9, 2024, 12:00 local
    const result = toDateKey(d.toISOString());
    expect(result).toBe('2024-01-09');
  });

  it('returns correct format pattern', () => {
    const result = toDateKey('2024-11-20T08:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('roundToNearest5', () => {
  it('rounds down to nearest multiple of 5', () => {
    expect(roundToNearest5(67)).toBe(65);
    expect(roundToNearest5(84)).toBe(80);
  });

  it('returns same value if already multiple of 5', () => {
    expect(roundToNearest5(75)).toBe(75);
    expect(roundToNearest5(0)).toBe(0);
  });

  it('handles values just below boundary', () => {
    expect(roundToNearest5(4)).toBe(0);
    expect(roundToNearest5(9)).toBe(5);
  });

  it('handles 100', () => {
    expect(roundToNearest5(100)).toBe(100);
  });

  it('handles decimal inputs', () => {
    expect(roundToNearest5(67.5)).toBe(65);
    expect(roundToNearest5(84.9)).toBe(80);
  });
});

describe('toLocalTimeValue', () => {
  it('returns HH:MM from an ISO string in local time', () => {
    const d = new Date(2024, 2, 5, 14, 30, 0); // 14:30 local
    const result = toLocalTimeValue(d.toISOString());
    expect(result).toBe('14:30');
  });

  it('pads hours and minutes with leading zeros', () => {
    const d = new Date(2024, 2, 5, 2, 5, 0); // 02:05 local
    const result = toLocalTimeValue(d.toISOString());
    expect(result).toBe('02:05');
  });

  it('returns midnight correctly', () => {
    const d = new Date(2024, 2, 5, 0, 0, 0); // 00:00 local
    const result = toLocalTimeValue(d.toISOString());
    expect(result).toBe('00:00');
  });
});

describe('toLocalDatetimeValue', () => {
  it('returns YYYY-MM-DDTHH:MM from an ISO string in local time', () => {
    const d = new Date(2024, 2, 5, 14, 30, 0); // March 5, 2024, 14:30 local
    const result = toLocalDatetimeValue(d.toISOString());
    expect(result).toBe('2024-03-05T14:30');
  });

  it('pads all components with leading zeros', () => {
    const d = new Date(2024, 0, 9, 2, 5, 0); // Jan 9, 2024, 02:05 local
    const result = toLocalDatetimeValue(d.toISOString());
    expect(result).toBe('2024-01-09T02:05');
  });

  it('matches format pattern YYYY-MM-DDTHH:MM', () => {
    const d = new Date(2024, 11, 25, 23, 59, 0);
    const result = toLocalDatetimeValue(d.toISOString());
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe('nowTimeValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns current local time as HH:MM', () => {
    const mockDate = new Date(2024, 2, 5, 9, 7, 0); // 09:07 local
    vi.setSystemTime(mockDate);
    expect(nowTimeValue()).toBe('09:07');
  });

  it('returns HH:MM format pattern', () => {
    vi.setSystemTime(new Date(2024, 5, 15, 23, 45, 0));
    expect(nowTimeValue()).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('nowDateValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns current local date as YYYY-MM-DD', () => {
    const mockDate = new Date(2024, 2, 5, 12, 0, 0); // March 5, 2024 local
    vi.setSystemTime(mockDate);
    expect(nowDateValue()).toBe('2024-03-05');
  });

  it('returns YYYY-MM-DD format pattern', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0));
    expect(nowDateValue()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatTime', () => {
  it('returns 12-hour time string', () => {
    // Use a local date so we know the local hour
    const d = new Date(2024, 2, 5, 14, 30, 0); // 14:30 local = 02:30 PM
    const result = formatTime(d.toISOString());
    expect(result).toBe('02:30 PM');
  });

  it('returns AM for morning times', () => {
    const d = new Date(2024, 2, 5, 9, 5, 0); // 09:05 local = 09:05 AM
    const result = formatTime(d.toISOString());
    expect(result).toBe('09:05 AM');
  });

  it('returns noon correctly', () => {
    const d = new Date(2024, 2, 5, 12, 0, 0);
    const result = formatTime(d.toISOString());
    expect(result).toBe('12:00 PM');
  });

  it('returns midnight correctly', () => {
    const d = new Date(2024, 2, 5, 0, 0, 0);
    const result = formatTime(d.toISOString());
    expect(result).toBe('12:00 AM');
  });
});

describe('formatDateLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set "today" to March 5, 2024 (Tuesday) at noon local time
    vi.setSystemTime(new Date(2024, 2, 5, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Day · Today" for today', () => {
    const today = new Date(2024, 2, 5, 8, 0, 0);
    const result = formatDateLabel(today.toISOString());
    expect(result).toContain('Today');
    expect(result).toMatch(/\w+ · Today/);
  });

  it('returns "Day · Yesterday" for yesterday', () => {
    const yesterday = new Date(2024, 2, 4, 8, 0, 0);
    const result = formatDateLabel(yesterday.toISOString());
    expect(result).toContain('Yesterday');
    expect(result).toMatch(/\w+ · Yesterday/);
  });

  it('returns "Day · Mon DD" for older dates in same year', () => {
    const olderDate = new Date(2024, 0, 15, 8, 0, 0); // Jan 15, 2024
    const result = formatDateLabel(olderDate.toISOString());
    expect(result).not.toContain('Today');
    expect(result).not.toContain('Yesterday');
    expect(result).toContain('Jan 15');
  });

  it('returns year for dates in different year', () => {
    const lastYear = new Date(2023, 5, 10, 8, 0, 0); // June 10, 2023
    const result = formatDateLabel(lastYear.toISOString());
    expect(result).toContain('2023');
  });
});

describe('formatMsTimer', () => {
  it('formats 0ms as 0:00', () => {
    expect(formatMsTimer(0)).toBe('0:00');
  });

  it('formats 65000ms as 1:05', () => {
    expect(formatMsTimer(65_000)).toBe('1:05');
  });

  it('formats 125000ms as 2:05', () => {
    expect(formatMsTimer(125_000)).toBe('2:05');
  });

  it('formats exactly 60 seconds as 1:00', () => {
    expect(formatMsTimer(60_000)).toBe('1:00');
  });

  it('pads seconds with leading zero', () => {
    expect(formatMsTimer(9_000)).toBe('0:09');
  });

  it('handles large values', () => {
    expect(formatMsTimer(3_600_000)).toBe('60:00');
  });

  it('truncates sub-second values', () => {
    expect(formatMsTimer(999)).toBe('0:00');
  });
});

describe('extractErrorMessage', () => {
  it('returns null when no arguments', () => {
    expect(extractErrorMessage()).toBeNull();
  });

  it('returns null for non-Error values', () => {
    expect(extractErrorMessage('string error', 42, null, undefined)).toBeNull();
  });

  it('returns message from first Error instance', () => {
    const err = new Error('something broke');
    expect(extractErrorMessage(err)).toBe('something broke');
  });

  it('returns first Error message when multiple arguments', () => {
    const err1 = new Error('first error');
    const err2 = new Error('second error');
    expect(extractErrorMessage(null, err1, err2)).toBe('first error');
  });

  it('skips non-Error values before finding an Error', () => {
    const err = new Error('found it');
    expect(extractErrorMessage('not an error', 0, err)).toBe('found it');
  });

  it('returns null for plain objects that are not Error instances', () => {
    expect(extractErrorMessage({ message: 'fake error' })).toBeNull();
  });
});

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns ceil(charCount / 4)', () => {
    expect(estimateTokens('abcd')).toBe(1); // 4 chars / 4 = 1
    expect(estimateTokens('abcde')).toBe(2); // 5 chars / 4 = 1.25 → ceil = 2
    expect(estimateTokens('abcdefgh')).toBe(2); // 8 / 4 = 2
  });

  it('handles single character', () => {
    expect(estimateTokens('a')).toBe(1); // ceil(1/4) = 1
  });

  it('handles 400 characters', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100);
  });
});

describe('formatInputSize', () => {
  it('returns empty string for empty text', () => {
    expect(formatInputSize('')).toBe('');
  });

  it('returns "X chars · ~Y tokens" for small text', () => {
    // 8 chars → 2 tokens
    const result = formatInputSize('abcdefgh');
    expect(result).toBe('8 chars · ~2 tokens');
  });

  it('returns "X chars · ~Y.Yk tokens" for >1000 tokens', () => {
    // Need > 4000 chars for > 1000 tokens
    const text = 'a'.repeat(4004); // 4004 chars → ceil(4004/4) = 1001 tokens
    const result = formatInputSize(text);
    expect(result).toContain('4004 chars');
    expect(result).toContain('~1.0k tokens');
  });

  it('returns correct format for exactly 1001 tokens boundary', () => {
    const text = 'a'.repeat(4004);
    expect(formatInputSize(text)).toMatch(/\d+ chars · ~\d+\.\dk tokens/);
  });

  it('returns correct format for exactly 1000 tokens (not over threshold)', () => {
    const text = 'a'.repeat(4000); // exactly 1000 tokens
    const result = formatInputSize(text);
    expect(result).toBe('4000 chars · ~1000 tokens');
  });
});

describe('formatPricePerToken', () => {
  it('formats prices >= $0.000001 per token with 7 decimal places', () => {
    // $1 per million = $0.000001 per token
    const result = formatPricePerToken(1);
    expect(result).toBe('$0.0000010');
  });

  it('formats prices < $0.000001 per token with M suffix', () => {
    // $0.5 per million = $0.0000005 per token (< 0.000001)
    const result = formatPricePerToken(0.5);
    expect(result).toBe('$0.50M');
  });

  it('formats $3 per million correctly', () => {
    const result = formatPricePerToken(3);
    expect(result).toBe('$0.0000030');
  });

  it('formats $15 per million correctly', () => {
    const result = formatPricePerToken(15);
    expect(result).toBe('$0.0000150');
  });
});

describe('formatModelPricing', () => {
  it('formats input and output prices', () => {
    expect(formatModelPricing(3, 15)).toBe('$3/1M in · $15/1M out');
  });

  it('formats decimal prices', () => {
    expect(formatModelPricing(0.25, 1.25)).toBe('$0.25/1M in · $1.25/1M out');
  });

  it('formats zero prices', () => {
    expect(formatModelPricing(0, 0)).toBe('$0/1M in · $0/1M out');
  });
});

describe('generateChatTitle', () => {
  it('returns New Chat for empty string', () => {
    expect(generateChatTitle('')).toBe('New Chat');
  });

  it('returns New Chat for null/undefined-like non-string', () => {
    expect(generateChatTitle(null as unknown as string)).toBe('New Chat');
  });

  it('capitalizes first letter', () => {
    expect(generateChatTitle('hello world')).toBe('Hello world');
  });

  it('extracts first sentence ending with period', () => {
    const result = generateChatTitle('Fix the bug. And also this other thing.');
    expect(result).toBe('Fix the bug.');
  });

  it('extracts first sentence ending with question mark', () => {
    const result = generateChatTitle('How do I do this? And some more text.');
    expect(result).toBe('How do I do this?');
  });

  it('truncates at word boundary at maxLength', () => {
    const message = 'This is a very long message that goes well beyond sixty characters in length';
    const result = generateChatTitle(message, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    // Should not cut mid-word
    expect(result).toMatch(/\S$/); // ends with non-space
  });

  it('strips attached file references', () => {
    const message = 'Please review this [Attached file: image.png] and let me know.';
    const result = generateChatTitle(message);
    expect(result).not.toContain('[Attached file:');
    expect(result).not.toContain('image.png');
  });

  it('strips multiple attached file references', () => {
    const message = '[Attached file: a.txt] [Attached file: b.txt] Do something';
    const result = generateChatTitle(message);
    expect(result).not.toContain('Attached file');
    expect(result).toContain('Do something');
  });

  it('uses custom maxLength', () => {
    const message = 'Short message here that is fine';
    const result = generateChatTitle(message, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('handles message shorter than maxLength', () => {
    expect(generateChatTitle('Hi there', 60)).toBe('Hi there');
  });

  it('returns New Chat for message with only attached file reference', () => {
    const message = '[Attached file: image.png]';
    const result = generateChatTitle(message);
    expect(result).toBe('New Chat');
  });
});
