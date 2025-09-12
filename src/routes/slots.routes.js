import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.js';
import * as ctrl from '../controllers/slots.controller.js';

const router = Router();

router.get('/', ctrl.listPublic);                           // public
router.post('/', authenticate, requireRole('host'), ctrl.create); // host

export default router;
