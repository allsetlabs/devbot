import { desc, eq } from 'drizzle-orm';
import { coreDb, interactive_chats, chat_messages } from './db/core.js';

const SESSION_LIMIT_TRIGGER = "You've hit your session limit";
const SESSION_LIMIT_CONTINUE_PROMPT = "It's past the session limit time, please continue.";
const MINUTE_IN_MS = 60_000;

interface ScheduledFollowUp {
  timeout: NodeJS.Timeout;
  triggerSequence: number;
  scheduledFor: string;
}

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface SessionLimitMatch {
  timeText: string;
  timezone: string;
  matchedLine: string;
}

const scheduledFollowUps = new Map<string, ScheduledFollowUp>();

function extractTextBlocks(data: Record<string, unknown>): string {
  const message = data.message;
  if (!message || typeof message !== 'object') return '';

  const blocks = (message as { content?: unknown }).content;
  if (!Array.isArray(blocks)) return '';

  return blocks
    .flatMap((block) => {
      if (!block || typeof block !== 'object') return [];
      const typedBlock = block as { type?: unknown; text?: unknown };
      return typedBlock.type === 'text' && typeof typedBlock.text === 'string'
        ? [typedBlock.text]
        : [];
    })
    .join('\n');
}

function extractSessionLimitMatch(text: string): SessionLimitMatch | null {
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
    matchedLine,
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

  if (meridiem === 'am') {
    hour = hour % 12;
  } else {
    hour = hour % 12 + 12;
  }

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
  const guessDate = new Date(utcGuess);
  const zonedGuess = getZonedParts(guessDate, timeZone);
  const targetUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const zonedGuessUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second
  );

  return new Date(utcGuess + (targetUtc - zonedGuessUtc));
}

function computeScheduledTime(timeText: string, timeZone: string): Date | null {
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

  return new Date(candidate.getTime() + MINUTE_IN_MS);
}

function getLatestSequence(chatId: string): number | null {
  const row = coreDb
    .select({ sequence: chat_messages.sequence })
    .from(chat_messages)
    .where(eq(chat_messages.chat_id, chatId))
    .orderBy(desc(chat_messages.sequence))
    .limit(1)
    .get();

  return row?.sequence ?? null;
}

export function clearSessionLimitFollowUp(chatId: string): void {
  const existing = scheduledFollowUps.get(chatId);
  if (!existing) return;

  clearTimeout(existing.timeout);
  scheduledFollowUps.delete(chatId);
  console.log(`[InteractiveChat] Cleared session-limit follow-up for chat ${chatId}`);
}

export function getSessionLimitContinuePrompt(): string {
  return SESSION_LIMIT_CONTINUE_PROMPT;
}

export function maybeScheduleSessionLimitFollowUp(
  chatId: string,
  data: Record<string, unknown>,
  options: {
    isChatExecuting: (chatId: string) => boolean;
    onFire: () => Promise<void>;
  }
): void {
  const text = extractTextBlocks(data);
  const match = extractSessionLimitMatch(text);
  if (!match) return;

  const scheduledFor = computeScheduledTime(match.timeText, match.timezone);
  if (!scheduledFor) {
    console.warn(
      `[InteractiveChat] Failed to parse session-limit reset time for chat ${chatId}: ${match.matchedLine}`
    );
    return;
  }

  const triggerSequence = getLatestSequence(chatId);
  if (triggerSequence === null) {
    console.warn(
      `[InteractiveChat] Missing trigger sequence for session-limit follow-up in chat ${chatId}`
    );
    return;
  }

  clearSessionLimitFollowUp(chatId);

  const delayMs = Math.max(0, scheduledFor.getTime() - Date.now());
  const timeout = setTimeout(() => {
    scheduledFollowUps.delete(chatId);

    try {
      const chat = coreDb
        .select({ id: interactive_chats.id })
        .from(interactive_chats)
        .where(eq(interactive_chats.id, chatId))
        .limit(1)
        .get();

      if (!chat) {
        console.log(
          `[InteractiveChat] Skipping session-limit follow-up for missing chat ${chatId}`
        );
        return;
      }

      if (options.isChatExecuting(chatId)) {
        console.log(
          `[InteractiveChat] Skipping session-limit follow-up for busy chat ${chatId}`
        );
        return;
      }

      const latestSequence = getLatestSequence(chatId);
      if (latestSequence !== triggerSequence) {
        console.log(
          `[InteractiveChat] Skipping session-limit follow-up for chat ${chatId}; advanced from ${triggerSequence} to ${latestSequence ?? 'none'}`
        );
        return;
      }

      options.onFire().catch((error: unknown) => {
        console.error(
          `[InteractiveChat] Failed to send session-limit follow-up for chat ${chatId}:`,
          error
        );
      });
    } catch (error) {
      console.error(
        `[InteractiveChat] Session-limit follow-up timer failed for chat ${chatId}:`,
        error
      );
    }
  }, delayMs);

  scheduledFollowUps.set(chatId, {
    timeout,
    triggerSequence,
    scheduledFor: scheduledFor.toISOString(),
  });

  console.log(
    `[InteractiveChat] Scheduled session-limit follow-up for chat ${chatId} at ${scheduledFor.toISOString()}`
  );
}
