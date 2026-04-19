import { Router } from 'express';
import { createProfilesHandlers } from './handlers/profiles.js';
import { createPlansHandlers } from './handlers/plans.js';
import { createPhotosHandlers } from './handlers/photos.js';
import { lawnCareDb, initializeLawnCareDatabase } from './db.js';
import type { LawnProfile } from './schema.js';
import type { LawnPlanData } from './types.js';

export type GeneratePlanFn = (planId: string, profile: LawnProfile) => Promise<LawnPlanData>;

export function getLawnCareRouter(options?: { generatePlan?: GeneratePlanFn }): Router {
  // Initialize this plugin's database
  initializeLawnCareDatabase();

  const router = Router();

  const profilesHandlers = createProfilesHandlers(lawnCareDb);
  const plansHandlers = createPlansHandlers(lawnCareDb, options?.generatePlan);
  const photosHandlers = createPhotosHandlers(lawnCareDb);

  // Mount handlers at relative paths (will be mounted at /api/plugins/lawn-care by main app)
  router.use('/profiles', profilesHandlers);
  router.use('/plans', plansHandlers);
  router.use('/photos', photosHandlers);

  return router;
}
