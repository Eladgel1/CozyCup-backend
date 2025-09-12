import { Router } from 'express';
import health from './health.routes.js';
import auth from './auth.routes.js';
import menuRoutes from './menu.routes.js';
import pickupRoutes from './pickup-windows.routes.js';

const router = Router();

// Health & Auth
router.use('/health', health);
router.use('/auth', auth);

// Domain routes
router.use('/menu', menuRoutes);
router.use('/pickup-windows', pickupRoutes);


// Optional welcome route during early dev
router.get('/', (req, res) => {
  res.json({
    name: 'CozyCup API',
    message: 'Welcome to CozyCup backend',
    docs: '/health'
  });
});

export default router;
