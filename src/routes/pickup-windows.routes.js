import { Router } from 'express';
import * as ctrl from '../controllers/pickup-windows.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', ctrl.listPublic);

// Host-only management
router.post('/', authenticate, requireRole('host'), ctrl.create);
router.patch('/:id', authenticate, requireRole('host'), ctrl.update);

export default router;
