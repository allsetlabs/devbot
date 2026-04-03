import { Router } from 'express';
import { createLogsHandlers } from './handlers/logs.js';
import { createProfilesHandlers } from './handlers/profiles.js';
import { babyLogsDb, initializeBabyLogsDatabase } from './db.js';

export default function getBabyLogsRouter(): Router {
  // Initialize this plugin's database
  initializeBabyLogsDatabase();

  const router = Router();

  const logsHandlers = createLogsHandlers(babyLogsDb);
  const profilesHandlers = createProfilesHandlers(babyLogsDb);

  // Mount handlers at relative paths (will be mounted at /api/plugins/baby-logs by main app)
  router.use('/logs', logsHandlers);
  router.use('/profiles', profilesHandlers);

  return router;
}
