import { Package } from '../models/package.model.js';
import { AppError } from '../middlewares/error.js';
import logger from '../config/logger.js';

function assertObjectId(id, name = 'id') {
  if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', `Invalid ${name}`, 400);
}

// GET /packages (public)
export async function list(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    const filter = { isActive: true };
    const [items, total] = await Promise.all([
      Package.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      Package.countDocuments(filter)
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

// POST /packages (host)
export async function create(req, res, next) {
  try {
    if (req.auth?.role !== 'host') {
      throw new AppError('FORBIDDEN', 'Host role required', 403);
    }
    const { name, credits, price, isActive } = req.body || {};

    if (typeof name !== 'string' || !name.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Invalid name', 400);
    }
    const nCredits = Number(credits);
    const nPrice = Number(price);
    if (!Number.isFinite(nCredits) || nCredits < 1) {
      throw new AppError('VALIDATION_ERROR', 'Invalid credits', 400);
    }
    if (!Number.isFinite(nPrice) || nPrice < 0) {
      throw new AppError('VALIDATION_ERROR', 'Invalid price', 400);
    }

    const pkg = await Package.create({
      name: name.trim().slice(0, 120),
      credits: nCredits,
      price: nPrice,
      isActive: Boolean(isActive ?? true)
    });

    logger.info({ msg: 'package_created', packageId: pkg._id.toString(), name: pkg.name });
    res.status(201).json(pkg);
  } catch (err) {
    next(err);
  }
}
