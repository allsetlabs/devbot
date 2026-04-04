import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';

/** Send a 404 Not Found response */
export function sendNotFound(res: Response, entity: string): void {
  res.status(404).json({ error: 'Not found', message: `${entity} not found` });
}

/** Send a 500 Internal Error response and log the error */
export function sendInternalError(res: Response, error: unknown, context: string): void {
  console.error(`Error ${context}:`, error);
  res.status(500).json({ error: 'Internal error', message: `Failed to ${context}` });
}

/** Send a 400 Bad Request response */
export function sendBadRequest(res: Response, message: string): void {
  res.status(400).json({ error: 'Bad request', message });
}

/** Validate a required non-empty string field. Returns true if valid, sends 400 and returns false if not. */
export function requireString(res: Response, value: unknown, fieldName: string): value is string {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    sendBadRequest(res, `${fieldName} is required`);
    return false;
  }
  return true;
}

/** Validate an optional string field for updates. Returns true if valid, sends 400 and returns false if not. */
export function validateOptionalString(res: Response, value: unknown, fieldName: string): boolean {
  if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0)) {
    sendBadRequest(res, `Invalid ${fieldName}`);
    return false;
  }
  return true;
}

/** Validate that a value is one of the allowed enum values. Returns true if valid, sends 400 if not. */
export function requireEnum<T extends string>(
  res: Response,
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): value is T {
  if (!value || !allowed.includes(value as T)) {
    sendBadRequest(res, `Invalid ${fieldName}. Must be one of: ${allowed.join(', ')}`);
    return false;
  }
  return true;
}

/** Generate a short UUID (default 8 chars) */
export function generateId(length = 8): string {
  return uuidv4().slice(0, length);
}

/** Fetch a single row by ID from a table. Returns the row or sends 404 and returns null. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getOneById<T extends SQLiteTableWithColumns<any>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { select: () => any },
  table: T,
  id: string,
  entityName: string,
  res: Response
): Promise<T['$inferSelect'] | null> {
  const rows = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!rows || rows.length === 0) {
    sendNotFound(res, entityName);
    return null;
  }
  return rows[0];
}

/** Wrap async route handlers to catch errors automatically */
export function asyncHandler<Req extends Request = Request<Record<string, string>>>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<void>,
  context: string
) {
  return (req: Req, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      sendInternalError(res, error, context);
    });
  };
}
