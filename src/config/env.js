import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config(); // loads .env if present

const toNumber = (val, fallback) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

// normalize multiline PEM stored as single-line with \n
const normalizePem = (val) => (val ? val.replace(/(\\n|\n)/g, '\n') : '');

// load PEM from file path if provided
const loadPemFromPath = (maybePath) => {
  if (!maybePath) return '';
  try {
    const resolved = path.resolve(maybePath);
    if (fs.existsSync(resolved)) {
      return fs.readFileSync(resolved, 'utf8');
    }
  } catch {
    /* ignore */
  }
  return '';
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: toNumber(process.env.PORT, 3000),

  // DB
  MONGO_URI: process.env.MONGO_URI ?? '',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',

  // JWT
  JWT_PRIVATE_KEY:
    loadPemFromPath(process.env.JWT_PRIVATE_KEY_PATH) ||
    normalizePem(process.env.JWT_PRIVATE_KEY ?? ''),

  JWT_PUBLIC_KEY:
    loadPemFromPath(process.env.JWT_PUBLIC_KEY_PATH) ||
    normalizePem(process.env.JWT_PUBLIC_KEY ?? ''),

  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '7d',
};
