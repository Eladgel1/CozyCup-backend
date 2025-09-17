import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import * as ctrl from '../controllers/slots.controller.js';
import { validate } from '../middlewares/validate.js';
import { createSlotSchema } from '../schemas/slots.schema.js';

const router = Router();

router.get('/', ctrl.listPublic);
router.post('/', authenticate, requireRole('host'), validate(createSlotSchema), ctrl.create);

export default router;
