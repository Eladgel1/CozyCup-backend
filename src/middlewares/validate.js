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
        query: req.query
      });
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        return next(new AppError('VALIDATION_ERROR', err.errors.map(e => e.message).join(', '), 400));
      }
      next(err);
    }
  };
}
