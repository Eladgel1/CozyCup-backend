import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import routes from './routes/index.js';
import { env } from './config/env.js';
import logger from './config/logger.js';
import generalLimiter from './middlewares/rate-limit.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

const allowedOrigins = (env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .filter(o => o !== '*');

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    // Keep credentials false unless you plan to use http-only cookies
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    optionsSuccessStatus: 204
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(generalLimiter);
app.use('/', routes);

app.use(notFound);
app.use(errorHandler);

logger.info({ msg: 'app_boot', env: env.NODE_ENV }, 'CozyCup API started');

export default app;
