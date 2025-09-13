import { Router } from 'express';
import health from './health.routes.js';
import auth from './auth.routes.js';
import menuRoutes from './menu.routes.js';
import pickupRoutes from './pickup-windows.routes.js';
import ordersRoutes from './orders.routes.js';
import slotsRoutes from './slots.routes.js';
import bookingsRoutes from './bookings.routes.js';
import checkinRoutes from './checkin.routes.js';
import packagesRoutes from './packages.routes.js';
import purchasesRoutes from './purchases.routes.js';
import redemptionsRoutes from './redemptions.routes.js';

const router = Router();

// Health & Auth
router.use('/health', health);
router.use('/auth', auth);

// Domain routes
router.use('/menu', menuRoutes);
router.use('/pickup-windows', pickupRoutes);
router.use('/orders', ordersRoutes);
router.use('/slots', slotsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/checkin', checkinRoutes);

router.use('/packages', packagesRoutes);
router.use('/purchase', purchasesRoutes);
router.use('/redeem', redemptionsRoutes);

// Optional welcome route during early dev
router.get('/', (req, res) => {
  res.json({
    name: 'CozyCup API',
    message: 'Welcome to CozyCup backend',
    docs: '/health'
  });
});

export default router;
