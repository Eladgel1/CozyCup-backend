// Express application bootstrap: middleware, routes, error handling
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import routes from './routes/index.js';
import { env } from './config/env.js';

const app = express();

// Security headers (minimal)
app.use(helmet());

// CORS (configurable per environment)
app.use(
  cors({
    origin: env.CORS_ORIGIN, // e.g., http://localhost:5173 in dev
    credentials: false       // set true only if you later use HTTP-only cookies
  })
);

// Core parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health & API routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl
  });
});

// Basic error handler (minimal at this step)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

export default app;
