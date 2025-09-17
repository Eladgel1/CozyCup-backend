import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/orders.controller.js';
import { validate } from '../middlewares/validate.js';
import { createOrderSchema, updateOrderStatusSchema } from '../schemas/orders.schema.js';

const router = Router();

// Customer endpoints
router.post('/', authenticate, validate(createOrderSchema), ctrl.create);
router.get('/me', authenticate, ctrl.listMine);

// Status transitions
router.patch('/:id/status', authenticate, validate(updateOrderStatusSchema) ,ctrl.updateStatus); // host or allowed customer cancel

export default router;
