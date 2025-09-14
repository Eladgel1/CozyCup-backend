import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/reports.controller.js';
import { validate } from '../middlewares/validate.js';
import { daySummarySchema } from '../schemas/reports.schema.js';

const router = Router();

router.get('/day-summary', authenticate, validate(daySummarySchema), ctrl.getDaySummary);

export default router;
