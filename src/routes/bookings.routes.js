import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/bookings.controller.js';

const router = Router();

router.post('/', authenticate, ctrl.create);     // customer
router.get('/me', authenticate, ctrl.listMine);  // customer
// optional (recommended)
router.patch('/:id/cancel', authenticate, ctrl.cancel);

export default router;
