import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

function normalizePEM(pem) {
  if (!pem) return '';
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem;
}

const PRIVATE_KEY = normalizePEM(env.JWT_PRIVATE_KEY);
const PUBLIC_KEY  = normalizePEM(env.JWT_PUBLIC_KEY);

const ISSUER   = env.QR_ISSUER   || 'cozycup-qr';
const AUDIENCE = env.QR_AUDIENCE || 'cozycup-kiosk';
const TTL      = env.QR_TTL      || '10m';

// payload must include: bid (bookingId), sid (slotId), sub (customerId)
export function signCheckinToken({ bookingId, slotId, customerId }) {
  if (!bookingId || !slotId || !customerId) {
    throw new Error('signCheckinToken: missing required fields');
  }
  const jti = randomUUID();
  const token = jwt.sign(
    { bid: String(bookingId), sid: String(slotId), sub: String(customerId), typ: 'checkin' },
    PRIVATE_KEY,
    { algorithm: 'RS256', issuer: ISSUER, audience: AUDIENCE, expiresIn: TTL, jwtid: jti }
  );
  return { token, jti };
}

export function verifyCheckinToken(token) {
  const payload = jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'], issuer: ISSUER, audience: AUDIENCE });
  // sanity check
  if (payload?.typ !== 'checkin' || !payload?.bid || !payload?.sid || !payload?.sub) {
    throw new Error('Invalid QR token payload');
  }
  return payload;
}
