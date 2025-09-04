class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res, _next) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' }
  });
}

function errorHandler(err, req, res, _next) {
  const isJsonSyntax =
    err instanceof SyntaxError &&
    err.type === 'entity.parse.failed';

  const status = isJsonSyntax ? 400 : (err.status || 500);

  const payload = {
    error: {
      code: isJsonSyntax
        ? 'BAD_JSON'
        : (err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST')),
      message: isJsonSyntax
        ? 'Malformed JSON in request body'
        : (err.message || 'Internal server error'),
      details: err.details || null
    }
  };

  try {
    const logger = require('../config/logger');
    const logMethod = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
    logMethod({
      msg: 'request_error',
      method: req.method,
      url: req.originalUrl,
      status,
      error: { name: err.name, code: payload.error.code, message: err.message, stack: err.stack }
    });
  } catch (_) {
    (status >= 500 ? console.error : console.warn)(err);
  }

  res.status(status).json(payload);
}

export { AppError, notFound, errorHandler };