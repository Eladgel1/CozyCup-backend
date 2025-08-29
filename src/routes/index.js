import { Router } from 'express';
import health from './health.routes.js';

const router = Router();

router.use('/health', health);

// Optional welcome route during early dev
router.get('/', (req, res) => {
  res.json({
    name: 'CozyCup API',
    message: 'Welcome to CozyCup backend',
    docs: '/health'
  });
});

export default router;
