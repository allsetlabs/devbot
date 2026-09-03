/**
 * Assist Requests Store
 *
 * FileStore-backed persistence for Personal Assistant Mode.
 * Any running terminal / Claude session can request human attention by creating
 * an assist request. The user sees it on their phone, replies, and the
 * originating process receives the reply via a long-poll endpoint.
 */

import path from 'path';
import { FileStore, type FileStoreRecord } from '../file-store.js';

// ─── Types ──────────────────────────────────────────────────────────────

export type AssistRequestStatus = 'pending' | 'replied' | 'expired' | 'cancelled';

export type AssistRequestSource =
  | 'terminal'     // Manual terminal / CLI invocation
  | 'scheduler'    // Scheduler task requesting input
  | 'chat'         // Interactive chat agent
  | 'plugin'       // Plugin requesting input
  | 'system';      // System-level request

export interface AssistRequest extends FileStoreRecord {
  /** The question or prompt for the human */
  question: string;
  /** Optional context about what the requester is working on */
  context: string | null;
  /** Where the request came from */
  source: AssistRequestSource;
  /** Identifier for the specific source (e.g. chat ID, scheduler task ID) */
  sourceId: string | null;
  /** Human-friendly label for the source (e.g. chat name, task name) */
  sourceLabel: string | null;
  /** Current status */
  status: AssistRequestStatus;
  /** The user's reply (null until replied) */
  reply: string | null;
  /** When the reply was sent */
  repliedAt: string | null;
  /** Auto-expire after this many seconds (0 = never) */
  ttlSeconds: number;
  /** Whether this request triggered a push notification */
  notified: boolean;
}

// ─── Store ──────────────────────────────────────────────────────────────

const STORE_DIR = '/tmp/devbot/data';

export const assistRequestStore = new FileStore<AssistRequest>({
  filePath: path.join(STORE_DIR, 'assist-requests.json'),
  name: 'assist-requests',
  autoCommit: false,
  idLength: 10,
});

// ─── Waiters (long-poll subscribers) ────────────────────────────────────

interface Waiter {
  resolve: (reply: string) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/** Map of request ID → list of pending long-poll waiters */
const waiters = new Map<string, Waiter[]>();

/**
 * Register a waiter for a reply on a specific assist request.
 * Resolves when the reply arrives or rejects on timeout.
 */
export function waitForReply(requestId: string, timeoutMs = 30_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Remove this waiter on timeout
      const list = waiters.get(requestId);
      if (list) {
        const idx = list.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) list.splice(idx, 1);
        if (list.length === 0) waiters.delete(requestId);
      }
      reject(new Error('timeout'));
    }, timeoutMs);

    const waiter: Waiter = { resolve, reject, timeout };
    const existing = waiters.get(requestId);
    if (existing) {
      existing.push(waiter);
    } else {
      waiters.set(requestId, [waiter]);
    }
  });
}

/**
 * Notify all waiters that a reply has arrived for a request.
 */
export function notifyWaiters(requestId: string, reply: string): void {
  const list = waiters.get(requestId);
  if (!list) return;

  for (const waiter of list) {
    clearTimeout(waiter.timeout);
    waiter.resolve(reply);
  }
  waiters.delete(requestId);
}

/**
 * Cancel all waiters for a request (e.g. on cancel/expire).
 */
export function cancelWaiters(requestId: string): void {
  const list = waiters.get(requestId);
  if (!list) return;

  for (const waiter of list) {
    clearTimeout(waiter.timeout);
    waiter.reject(new Error('cancelled'));
  }
  waiters.delete(requestId);
}

// ─── Expiry checker ─────────────────────────────────────────────────────

/**
 * Check for and expire timed-out assist requests.
 * Called periodically to clean up stale requests.
 */
export async function expireStaleRequests(): Promise<number> {
  const all = await assistRequestStore.list({ filter: { status: 'pending' } });
  const now = Date.now();
  let expired = 0;

  for (const req of all) {
    if (req.ttlSeconds > 0) {
      const createdAt = new Date(req.created_at).getTime();
      const expiresAt = createdAt + req.ttlSeconds * 1000;
      if (now > expiresAt) {
        await assistRequestStore.update(req.id, {
          status: 'expired',
          updated_by: 'system',
        });
        cancelWaiters(req.id);
        expired++;
      }
    }
  }

  return expired;
}

// Check for expired requests every 60 seconds
setInterval(() => {
  expireStaleRequests().catch(() => {});
}, 60_000);
