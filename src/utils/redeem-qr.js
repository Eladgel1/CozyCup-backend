import jwt from 'jsonwebtoken';
import { AppError } from '../middlewares/error.js';

function getPrivateKey() {
  const key = process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!key) throw new AppError('SERVER_CONFIG', 'Missing JWT_PRIVATE_KEY', 500);
  return key;
}

function getPublicKey() {
  const key = process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
  if (!key) throw new AppError('SERVER_CONFIG', 'Missing JWT_PUBLIC_KEY', 500);
  return key;
}

function getTtl() {
  // Dedicated TTL for redemption QR; fallback to generic QR_TTL or 5m
  return process.env.QR_TTL_REDEEM || process.env.QR_TTL || '5m';
}

// Sign a short-lived token for performing a single redemption.
// payload: { purchaseId, customerId }

export function signRedeemToken(payload) {
  if (!payload?.purchaseId || !payload?.customerId) {
    throw new AppError('VALIDATION_ERROR', 'Missing purchaseId/customerId', 400);
  }
  const token = jwt.sign(
    {
      sub: String(payload.customerId),
      typ: 'redeem',
      purchaseId: String(payload.purchaseId),
    },
    getPrivateKey(),
    { algorithm: 'RS256', expiresIn: getTtl() }
  );
  return { token };
}

// Verify a redemption token and return its decoded payload.
// Throws AppError on invalid/expired tokens.

export function verifyRedeemToken(token) {
  if (!token || typeof token !== 'string') {
    throw new AppError('VALIDATION_ERROR', 'Missing token', 400);
  }
  try {
    const decoded = jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] });
    if (decoded?.typ !== 'redeem') throw new AppError('FORBIDDEN', 'Invalid token type', 403);
    return decoded;
  } catch (err) {
    if (err?.name === 'TokenExpiredError') throw new AppError('FORBIDDEN', 'Token expired', 403);
    throw new AppError('FORBIDDEN', 'Invalid token', 403);
  }
}
