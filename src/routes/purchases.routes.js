import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/purchases.controller.js';

const router = Router();

// Customer creates a purchase
router.post('/', authenticate, ctrl.create);

// Customer wallet (their purchases and balances)
router.get('/me/wallet', authenticate, ctrl.wallet);

export default router;
