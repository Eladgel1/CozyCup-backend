// Express application bootstrap: middleware, routes, error handling
import express from 'express';
import routes from './routes/index.js';
import helmet from 'helmet';

const app = express();

// Security headers (minimal)
app.use(helmet());

// Core parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health & API routes
app.use("/", routes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl
  });
});

// Basic error handler (minimal at this step)
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error"
  });
});

export default app;
