import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/packages.controller.js';

const router = Router();

// Public listing
router.get('/', ctrl.list);

// Host create
router.post('/', authenticate, ctrl.create);

export default router;
