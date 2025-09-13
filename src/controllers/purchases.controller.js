import { Package } from '../models/package.model.js';
import { Purchase } from '../models/purchase.model.js';
import { AppError } from '../middlewares/error.js';
import logger from '../config/logger.js';

function assertObjectId(id, name = 'id') {
  if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', `Invalid ${name}`, 400);
}

// POST /purchase (customer)
export async function create(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const { packageId, paymentMethod } = req.body || {};
    assertObjectId(packageId, 'packageId');

    const pkg = await Package.findOne({ _id: packageId, isActive: true }).lean();
    if (!pkg) throw new AppError('NOT_FOUND', 'Package not found/active', 404);

    const pm = paymentMethod === 'CASH' ? 'CASH' : 'MOCK';

    const purchase = await Purchase.create({
      customerId,
      packageId,
      creditsLeft: pkg.credits,
      paymentMethod: pm
    });

    logger.info({
      msg: 'purchase_created',
      purchaseId: purchase._id.toString(),
      customerId,
      packageId,
      creditsLeft: purchase.creditsLeft,
      paymentMethod: pm
    });

    res.status(201).json(purchase);
  } catch (err) {
    next(err);
  }
}

// GET /me/wallet (customer)
export async function wallet(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    const [items, total] = await Promise.all([
      Purchase.find({ customerId })
        .populate('packageId')
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      Purchase.countDocuments({ customerId })
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
}
