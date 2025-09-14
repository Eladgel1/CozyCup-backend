import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import User from '../models/user.model.js';
import { AppError } from '../middlewares/error.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, sha256, decodeToken } from '../utils/jwt.js';
import logger from '../config/logger.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema, refreshSchema, updateMeSchema  } from '../schemas/auth.schema.js';

const router = Router();

// --- helpers ---
async function issueAndPersistTokens(userId, role = 'customer') {
  const { token: accessToken } = signAccessToken({ sub: userId, role });
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

// Build anonymized email without relying on model statics
function buildAnonymizedEmail(userDoc) {
  const id = userDoc?._id?.toString?.() || 'user';
  const email = userDoc?.email || '';
  const domain = email.includes('@') ? email.split('@')[1] : 'anonymized.local';
  return `deleted_${id.slice(-6)}@${domain}`;
}

// --- POST /auth/register ---
router.post('/register', validate(registerSchema) , async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new AppError('VALIDATION_ERROR', 'email and password are required', 400);
    }
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
      throw new AppError('VALIDATION_ERROR', 'invalid email or password too short (min 8)', 400);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw new AppError('CONFLICT', 'User already exists', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email: email.toLowerCase(), passwordHash, role: 'customer' });

    const tokens = await issueAndPersistTokens(user._id.toString(), user.role);
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
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new AppError('VALIDATION_ERROR', 'email and password are required', 400);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    if (user.isDeleted) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);

    const tokens = await issueAndPersistTokens(user._id.toString(), user.role);
    logger.info({ msg: 'user_login', userId: user._id.toString() });

    res.json({
      user: { id: user._id, email: user.email, role: user.role },
      tokens
    });
  } catch (err) {
    next(err);
  }
});

// --- POST /auth/refresh ---
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) throw new AppError('VALIDATION_ERROR', 'refreshToken is required', 400);

    const payload = verifyRefreshToken(refreshToken);
    const userId = payload.sub;

    const user = await User.findById(userId).select('+refreshTokenHash +refreshTokenExpiresAt isDeleted role');
    if (!user || !user.refreshTokenHash) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }
    if (user.isDeleted) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    }

    const incomingHash = sha256(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      throw new AppError('UNAUTHORIZED', 'Refresh token mismatch (rotated/invalidated)', 401);
    }
    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
      throw new AppError('UNAUTHORIZED', 'Refresh token expired', 401);
    }

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
    const user = await User.findById(req.auth.userId).select('_id email role name phone isDeleted createdAt');
    if (!user || user.isDeleted) throw new AppError('NOT_FOUND', 'User not found', 404);
    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name ?? null,
        phone: user.phone ?? null,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// --- PATCH /auth/me ---
router.patch('/me', authenticate, validate(updateMeSchema), async (req, res, next) => {
  try {
    const allowed = ['name', 'phone'];

    // Reject unknown fields explicitly (test expects 400)
    for (const key of Object.keys(req.body || {})) {
      if (!allowed.includes(key)) {
        throw new AppError('VALIDATION_ERROR', `unknown field: ${key}`, 400);
      }
    }

    const updates = {};
    for (const k of allowed) {
      if (k in req.body) {
        if (k === 'name' && typeof req.body[k] !== 'string') {
          throw new AppError('VALIDATION_ERROR', 'name must be a string', 400);
        }
        if (k === 'phone' && typeof req.body[k] !== 'string') {
          throw new AppError('VALIDATION_ERROR', 'phone must be a string', 400);
        }
        updates[k] = req.body[k].trim?.() ?? req.body[k];
      }
    }

    const user = await User.findById(req.auth.userId).select('_id isDeleted');
    if (!user || user.isDeleted) throw new AppError('NOT_FOUND', 'User not found', 404);

    if (Object.keys(updates).length === 0) {
      const current = await User.findById(req.auth.userId).select('_id email role name phone createdAt');
      return res.json({
        user: {
          id: current._id,
          email: current.email,
          role: current.role,
          name: current.name ?? null,
          phone: current.phone ?? null,
          createdAt: current.createdAt
        }
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.auth.userId,
      { $set: updates },
      { new: true, select: '_id email role name phone createdAt' }
    );

    res.json({
      user: {
        id: updated._id,
        email: updated.email,
        role: updated.role,
        name: updated.name ?? null,
        phone: updated.phone ?? null,
        createdAt: updated.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// --- DELETE /auth/me ---
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    // need email here for anonymized domain
    const user = await User.findById(req.auth.userId).select('_id email isDeleted');
    if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);

    if (user.isDeleted) {
      // idempotent delete
      return res.status(204).send();
    }

    const anonymizedEmail = buildAnonymizedEmail(user);
    const newRandomHash = await bcrypt.hash(randomUUID(), 12);

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          email: anonymizedEmail,
          name: null,
          phone: null,
          isDeleted: true,
          deletedAt: new Date(),
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
          passwordHash: newRandomHash
        }
      },
      { new: false }
    );

    logger.info({ msg: 'user_anonymized', userId: user._id.toString(), previousEmail: user.email });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;


