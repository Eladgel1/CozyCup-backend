import { Router } from 'express';
import * as ctrl from '../controllers/menu.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// Public listing for customers
router.get('/', ctrl.listPublic);

// Host-only writes
router.post('/', authenticate, requireRole('host'), ctrl.create);
router.patch('/:id', authenticate, requireRole('host'), ctrl.update);

export default router;
