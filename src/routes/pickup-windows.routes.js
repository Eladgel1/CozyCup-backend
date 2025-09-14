import { Router } from 'express';
import * as ctrl from '../controllers/pickup-windows.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createPickupWindowSchema, updatePickupWindowSchema } from '../schemas/pickup-windows.schema.js';

const router = Router();

router.get('/', ctrl.listPublic);

// Host-only management
router.post('/', authenticate, requireRole('host'), validate(createPickupWindowSchema), ctrl.create);
router.patch('/:id', authenticate, requireRole('host'),validte(updatePickupWindowSchema), ctrl.update);

export default router;
