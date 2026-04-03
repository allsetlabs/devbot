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

export interface LawnApplication {
  order: number;
  date: string;
  name: string;
  description: string;
  product: string;
  productUrl: string;
  store: string;
  productCovers: number;
  productPrice: number;
  applicationCost: number;
  howToApply: string;
  walkingPace: string;
  overlap: string;
  amount: string;
  tips: string;
  watering: string;
  warnings: string;
}

export interface LawnPlanData {
  summary: string;
  totalCost: number;
  store: string;
  applications: LawnApplication[];
}

export interface LawnProfileAPI {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  grassType: string;
  sqft: number | null;
  climateZone: string | null;
  sunExposure: 'full_sun' | 'partial_shade' | 'full_shade' | null;
  applicationMethod: 'spreader' | 'sprayer' | null;
  equipmentModel: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LawnPlanAPI {
  id: string;
  profileId: string;
  chatId: string | null;
  status: 'generating' | 'completed' | 'failed';
  planData: LawnPlanData | null;
  errorMessage: string | null;
  generatedAt: string | null;
  createdAt: string;
}

export interface LawnPhotoAPI {
  id: string;
  profileId: string;
  applicationOrder: number | null;
  fileUrl: string;
  caption: string | null;
  takenAt: string;
  createdAt: string;
}
