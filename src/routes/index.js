import { Router } from 'express';
import health from './health.routes.js';
import auth from './auth.routes.js';

const router = Router();

router.use('/health', health);
router.use('/auth', auth);

// Optional welcome route during early dev
router.get('/', (req, res) => {
  res.json({
    name: 'CozyCup API',
    message: 'Welcome to CozyCup backend',
    docs: '/health'
  });
});

export default router;
