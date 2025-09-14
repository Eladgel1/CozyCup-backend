import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/packages.controller.js';
import { validate } from '../middlewares/validate.js';
import { createPackageSchema } from '../schemas/packages.schema.js';

const router = Router();

// Public listing
router.get('/', ctrl.list);

// Host create
router.post('/', authenticate, validate(createPackageSchema) ,ctrl.create);

export default router;
