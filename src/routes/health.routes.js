import { Router } from 'express';


const router = Router();
const version = process.env.npm_package_version ?? '0.0.0';

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'cozycup-backend',
    version,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime())
  });
});

export default router;
