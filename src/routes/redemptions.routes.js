import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/redemptions.controller.js';

const router = Router();

// Redeem one credit (body: { purchaseId } or { token })
router.post('/', authenticate, ctrl.redeem);

// Create a QR token to redeem (body: { purchaseId })
router.post('/qr-token', authenticate, ctrl.createRedeemToken);

export default router;
