// src/middlewares/rate-limit.js
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const generalLimiter = rateLimit({
  windowMs: Number(process.env.RL_WINDOW_MS || 60_000),
  max: Number(process.env.RL_MAX || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many requests' }
  },
  // Safe for IPv6; avoids ERR_ERL_KEY_GEN_IPV6 warnings/errors
  keyGenerator: ipKeyGenerator,

  // Do not interfere with automated tests
  skip: () => process.env.NODE_ENV === 'test'
});

export default generalLimiter;

