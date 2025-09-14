import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/reports.controller.js';

const router = Router();

router.get('/day-summary', authenticate, ctrl.getDaySummary);

export default router;
