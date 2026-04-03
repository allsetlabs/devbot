import type { Request, Response, NextFunction } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginsDb = any;

/** Wrap async plugin route handlers to catch errors automatically */
export function pluginAsyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  context: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error(`Error ${context}:`, error);
      res.status(500).json({ error: `Failed to ${context}` });
    });
  };
}

/** Send a 404 response for a plugin entity */
export function pluginNotFound(res: Response, entity: string): void {
  res.status(404).json({ error: `${entity} not found` });
}

/** Send a 400 response for a plugin entity */
export function pluginBadRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

export interface BabyLogAPI {
  id: string;
  logType: 'feeding' | 'diaper' | 'weight' | 'height' | 'head_circumference';
  feedingType: 'bottle' | 'breast' | null;
  feedingDurationMin: number | null;
  feedingMl: number | null;
  breastSide: 'left' | 'right' | 'both' | null;
  diaperWetPct: 25 | 50 | 75 | 100 | null;
  diaperPoop: 'small' | 'large' | null;
  fedBy: string | null;
  note: string | null;
  weightKg: number | null;
  heightCm: number | null;
  headCircumferenceCm: number | null;
  loggedAt: string;
  createdAt: string;
}

export interface BabyProfileAPI {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  timeOfBirth: string | null;
  gender: 'male' | 'female';
  bloodType: string | null;
  placeOfBirth: string | null;
  cityOfBirth: string | null;
  stateOfBirth: string | null;
  countryOfBirth: string | null;
  citizenship: string | null;
  fatherName: string | null;
  motherName: string | null;
  birthWeightKg: number | null;
  birthHeightCm: number | null;
  gestationalWeek: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
