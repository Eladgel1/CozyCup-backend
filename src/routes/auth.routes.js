import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { AppError } from '../middlewares/error.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, sha256, decodeToken } from '../utils/jwt.js';
import logger from '../config/logger.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// --- helpers ---
async function issueAndPersistTokens(userId) {
  const { token: accessToken } = signAccessToken({ sub: userId, role: 'customer' }); // role will be read from DB
  const { token: refreshToken } = signRefreshToken({ sub: userId });

  const decoded = decodeToken(refreshToken);
  const exp = decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000) : null;

  await User.findByIdAndUpdate(
    userId,
    { $set: { refreshTokenHash: sha256(refreshToken), refreshTokenExpiresAt: exp } },
    { new: true }
  );

  return { accessToken, refreshToken, refreshTokenExpiresAt: exp };
}

// --- POST /auth/register ---
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) {
      throw new AppError('VALIDATION_ERROR', 'email and password are required', 400);
    }
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
      throw new AppError('VALIDATION_ERROR', 'invalid email or password too short (min 8)', 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('CONFLICT', 'User already exists', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    // Default role is customer; creating "host" should be restricted/admin-only. We ignore provided role unless it's explicitly allowed.
    const user = await User.create({ email: email.toLowerCase(), passwordHash, role: 'customer' });

    const tokens = await issueAndPersistTokens(user._id.toString());
    logger.info({ msg: 'user_registered', userId: user._id.toString(), email: user.email });

    res.status(201).json({
      user: { id: user._id, email: user.email, role: user.role },
      tokens
    });
  } catch (err) {
    next(err);
  }
});

// --- POST /auth/login ---
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new AppError('VALIDATION_ERROR', 'email and password are required', 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);

    const { token: accessToken } = signAccessToken({ sub: user._id.toString(), role: user.role });
    const { token: refreshToken } = signRefreshToken({ sub: user._id.toString() });

    const decoded = decodeToken(refreshToken);
    const exp = decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000) : null;

    await User.findByIdAndUpdate(
      user._id,
      { $set: { refreshTokenHash: sha256(refreshToken), refreshTokenExpiresAt: exp } },
      { new: true }
    );

    logger.info({ msg: 'user_login', userId: user._id.toString() });

    res.json({
      user: { id: user._id, email: user.email, role: user.role },
      tokens: { accessToken, refreshToken, refreshTokenExpiresAt: exp }
    });
  } catch (err) {
    next(err);
  }
});

// --- POST /auth/refresh ---
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) throw new AppError('VALIDATION_ERROR', 'refreshToken is required', 400);

    // Verify signature & expiration
    const payload = verifyRefreshToken(refreshToken);
    const userId = payload.sub;

    // Fetch user and compare hashed token
    const user = await User.findById(userId).select('+refreshTokenHash +refreshTokenExpiresAt');
    if (!user || !user.refreshTokenHash) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }

    const incomingHash = sha256(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      throw new AppError('UNAUTHORIZED', 'Refresh token mismatch (rotated/invalidated)', 401);
    }
    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
      throw new AppError('UNAUTHORIZED', 'Refresh token expired', 401);
    }

    // Rotate: issue new pair and persist
    const { token: newAccess } = signAccessToken({ sub: user._id.toString(), role: user.role });
    const { token: newRefresh } = signRefreshToken({ sub: user._id.toString() });

    const decoded = decodeToken(newRefresh);
    const exp = decoded?.payload?.exp ? new Date(decoded.payload.exp * 1000) : null;

    await User.findByIdAndUpdate(
      user._id,
      { $set: { refreshTokenHash: sha256(newRefresh), refreshTokenExpiresAt: exp } },
      { new: true }
    );

    logger.info({ msg: 'refresh_rotated', userId: user._id.toString() });

    res.json({ tokens: { accessToken: newAccess, refreshToken: newRefresh, refreshTokenExpiresAt: exp } });
  } catch (err) {
    next(err);
  }
});

// --- POST /auth/logout ---
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    await User.findByIdAndUpdate(userId, { $set: { refreshTokenHash: null, refreshTokenExpiresAt: null } });
    logger.info({ msg: 'user_logout', userId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- GET /auth/me ---
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId).select('_id email role createdAt');
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
    res.json({ user: { id: user._id, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    next(err);
  }
});

export default router;
