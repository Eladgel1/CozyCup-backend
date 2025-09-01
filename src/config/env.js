import dotenv from 'dotenv';

dotenv.config(); // loads .env if present

const toNumber = (val, fallback) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

// normalize multiline PEM that are stored as single-line with \n
const normalizePem = (val) => (val ? val.replace(/\\n/g, '\n') : '');

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: toNumber(process.env.PORT, 3000),

  // DB
  MONGO_URI: process.env.MONGO_URI ?? '',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',

  // JWT (used in Step 7)
  JWT_PRIVATE_KEY: normalizePem(process.env.JWT_PRIVATE_KEY ?? ''),
  JWT_PUBLIC_KEY: normalizePem(process.env.JWT_PUBLIC_KEY ?? ''),
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL ?? '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL ?? '7d'
};
