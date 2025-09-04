import rateLimit from 'express-rate-limit';

const generalLimiter = rateLimit({
  windowMs: Number(process.env.RL_WINDOW_MS || 60_000),
  max: Number(process.env.RL_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests' }
  },
  keyGenerator: (req) => req.ip
});

export default generalLimiter;
