import { Router } from 'express';
import * as ctrl from '../controllers/menu.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menu.schema.js';

const router = Router();

// Public listing for customers
router.get('/', ctrl.listPublic);

// Host-only writes
router.post('/', authenticate, requireRole('host'), validate(createMenuItemSchema), ctrl.create);
router.patch(
  '/:id',
  authenticate,
  requireRole('host'),
  validate(updateMenuItemSchema),
  ctrl.update
);

export default router;
