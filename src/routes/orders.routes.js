import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import * as ctrl from '../controllers/orders.controller.js';

const router = Router();

// Customer endpoints
router.post('/', authenticate, ctrl.create);
router.get('/me', authenticate, ctrl.listMine);

// Status transitions
router.patch('/:id/status', authenticate, ctrl.updateStatus); // host or allowed customer cancel

export default router;
