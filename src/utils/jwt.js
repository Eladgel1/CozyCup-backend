// JWT helper utilities (ESM, RS256)
import jwt from 'jsonwebtoken';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { env } from '../config/env.js';

const PRIVATE_KEY = env.JWT_PRIVATE_KEY;
const PUBLIC_KEY = env.JWT_PUBLIC_KEY;

const ACCESS_TTL = env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL = env.JWT_REFRESH_TTL || '7d';

const ISSUER = 'cozycup-api';
const AUDIENCE = 'cozycup-client';

export function signAccessToken({ sub, role }) {
  if (!PRIVATE_KEY) throw new Error('Missing JWT private key');
  const jti = randomUUID();
  const token = jwt.sign({ sub, role, jti }, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return { token, jti };
}

export function signRefreshToken({ sub }) {
  if (!PRIVATE_KEY) throw new Error('Missing JWT private key');
  const jti = randomUUID();
  const kid = randomBytes(8).toString('hex');

  const token = jwt.sign({ sub, jti }, PRIVATE_KEY, {
    keyid: kid,
    algorithm: 'RS256',
    expiresIn: REFRESH_TTL,
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return { token, jti };
}

export function verifyAccessToken(token) {
  if (!PUBLIC_KEY) throw new Error('Missing JWT public key');
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyRefreshToken(token) {
  if (!PUBLIC_KEY) throw new Error('Missing JWT public key');
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function decodeToken(token) {
  return jwt.decode(token, { complete: true });
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
