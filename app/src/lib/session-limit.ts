import type { ChatMessage } from '../types';

export const SESSION_LIMIT_TRIGGER = "You've hit your session limit";
export const SESSION_LIMIT_TOAST_MESSAGE =
  'Session timed out. It will automatically continue after the limit resets.';

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface SessionLimitState {
  triggerMessageId: string;
  triggerSequence: number;
  continueAt: Date;
  timezone: string;
}

export function extractChatMessageText(message: ChatMessage): string {
  const blocks = message.content?.message?.content;
  if (!blocks) return '';

  return blocks
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n');
}

function extractSessionLimitMatch(text: string): { timeText: string; timezone: string } | null {
  const matchedLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.includes(SESSION_LIMIT_TRIGGER));

  if (!matchedLine) return null;

  const match = matchedLine.match(/resets?\s+(\d{1,2}:\d{2}\s*[ap]m)\s+\(([^)]+)\)/i);
  if (!match) return null;

  return {
    timeText: match[1].trim(),
    timezone: match[2].trim(),
  };
}

function parseTwelveHourTime(timeText: string): { hour: number; minute: number } | null {
  const match = timeText.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (!match) return null;

  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const meridiem = match[3].toLowerCase();

  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 1 || hour > 12 || minute > 59) {
    return null;
  }

  hour = meridiem === 'am' ? hour % 12 : (hour % 12) + 12;
  return { hour, minute };
}

function getZonedParts(date: Date, timeZone: string): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number.parseInt(part.value, 10)])
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;

  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
    hour: lookup.hour,
    minute: lookup.minute,
    second: lookup.second,
  };
}

function zonedTimeToUtc(parts: ZonedDateParts, timeZone: string): Date {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const guessedDate = new Date(utcGuess);
  const zonedGuess = getZonedParts(guessedDate, timeZone);
  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const guessedUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second
  );

  return new Date(utcGuess + (targetUtc - guessedUtc));
}

function computeContinueAt(timeText: string, timeZone: string): Date | null {
  const parsedTime = parseTwelveHourTime(timeText);
  if (!parsedTime) return null;

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    return null;
  }

  const now = new Date();
  const zonedNow = getZonedParts(now, timeZone);
  let candidate = zonedTimeToUtc(
    {
      year: zonedNow.year,
      month: zonedNow.month,
      day: zonedNow.day,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      second: 0,
    },
    timeZone
  );

  if (candidate.getTime() <= now.getTime()) {
    candidate = zonedTimeToUtc(
      {
        year: zonedNow.year,
        month: zonedNow.month,
        day: zonedNow.day + 1,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
        second: 0,
      },
      timeZone
    );
  }

  return new Date(candidate.getTime() + 60_000);
}

export function getActiveSessionLimitState(messages: ChatMessage[]): SessionLimitState | null {
  let latestTrigger: SessionLimitState | null = null;

  for (const message of messages) {
    if (message.type !== 'assistant') continue;

    const match = extractSessionLimitMatch(extractChatMessageText(message));
    if (!match) continue;

    const continueAt = computeContinueAt(match.timeText, match.timezone);
    if (!continueAt) continue;

    latestTrigger = {
      triggerMessageId: message.id,
      triggerSequence: message.sequence,
      continueAt,
      timezone: match.timezone,
    };
  }

  if (!latestTrigger) return null;

  const hasLaterUserMessage = messages.some(
    (message) => message.type === 'user' && message.sequence > latestTrigger.triggerSequence
  );

  return hasLaterUserMessage ? null : latestTrigger;
}

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';

  const totalSeconds = Math.ceil(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
