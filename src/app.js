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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://cozycup-frontend.onrender.com',
];

app.use(
  cors({
    origin(origin, callback) {
      // allow tools like curl / health checks (no Origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
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
