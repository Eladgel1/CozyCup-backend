import { Router } from 'express';
import pkg from '../../package.json' assert { type: 'json' };

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cozycup-backend',
    version: pkg.version ?? '0.0.0',
    timestamp: new Date().toISOString(),
    uptime_s: Math.round(process.uptime())
  });
});

export default router;
