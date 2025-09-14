import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/purchases.controller.js';
import { validate } from '../middlewares/validate.js';
import { createPurchaseSchema } from '../schemas/purchases.schema.js';

const router = Router();

// Customer creates a purchase
router.post('/', authenticate, validate(createPurchaseSchema), ctrl.create);

// Customer wallet (their purchases and balances)
router.get('/me/wallet', authenticate, ctrl.wallet);

export default router;
