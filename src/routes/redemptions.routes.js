import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/redemptions.controller.js';
import { validate } from '../middlewares/validate.js';
import { redeemSchema, createRedeemTokenSchema } from '../schemas/redemptions.schema.js';

const router = Router();

// Redeem one credit (body: { purchaseId } or { token })
router.post('/', authenticate, validate(redeemSchema), ctrl.redeem);

// Create a QR token to redeem (body: { purchaseId })
router.post('/qr-token', authenticate, validate(createRedeemTokenSchema), ctrl.createRedeemToken);

export default router;
