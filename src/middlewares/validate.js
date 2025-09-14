import { AppError } from './error.js';

/**
 * Middleware to validate request using Zod schema
 * @param {ZodSchema} schema
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const issues = Array.isArray(err.issues) ? err.issues : [];
        const messages = issues.map((i) => i.message);
        return next(
          new AppError('VALIDATION_ERROR', messages.join(', ') || 'Invalid request', 400)
        );
      }
      next(err);
    }
  };
}
