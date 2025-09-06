// Auth middlewares: bearer authentication and RBAC checks
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './error.js'; // from your existing error module

export function authenticate(req, _res, next) {
  // Expect: Authorization: Bearer <accessToken>
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return next(new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401));
  }
  try {
    const payload = verifyAccessToken(token);
    // attach auth context
    req.auth = { userId: payload.sub, role: payload.role || 'customer', jti: payload.jti };
    return next();
  } catch (err) {
    return next(new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401));
  }
}

export function requireRole(...roles) {
  return function (req, _res, next) {
    const role = req.auth?.role;
    if (!role) return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    if (!roles.includes(role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
    }
    return next();
  };
}
