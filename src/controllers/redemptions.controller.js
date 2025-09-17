import mongoose from 'mongoose';
import { Purchase } from '../models/purchase.model.js';
import { Redemption } from '../models/redemption.model.js';
import { AppError } from '../middlewares/error.js';
import { verifyRedeemToken, signRedeemToken } from '../utils/redeem-qr.js';
import logger from '../config/logger.js';

function assertObjectId(id, name = 'id') {
  if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', `Invalid ${name}`, 400);
}

// POST /redeem
export async function redeem(req, res, next) {
  let session;
  try {
    const topologyType = mongoose.connection?.client?.topology?.description?.type;
    const supportsTxn = topologyType === 'ReplicaSet' || topologyType === 'Sharded';
    if (supportsTxn) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const { purchaseId, token } = req.body || {};
    let resolvedPurchaseId = purchaseId;

    if (token && !purchaseId) {
      const decoded = verifyRedeemToken(token);
      if (String(decoded.sub) !== String(customerId)) {
        throw new AppError('FORBIDDEN', 'Token does not belong to current user', 403);
      }
      resolvedPurchaseId = decoded.purchaseId;
    }

    assertObjectId(resolvedPurchaseId, 'purchaseId');

    const purchaseQuery = Purchase.findOne({ _id: resolvedPurchaseId, customerId });
    if (session) purchaseQuery.session(session);
    const purchase = await purchaseQuery;
    if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found', 404);
    if (purchase.creditsLeft <= 0) throw new AppError('CONFLICT', 'No credits left', 409);

    purchase.creditsLeft -= 1;
    await purchase.save(session ? { session } : {});

    const [redemption] = await Redemption.create(
      [{ customerId, purchaseId: purchase._id }],
      session ? { session } : {}
    );

    if (session) await session.commitTransaction();

    logger.info({
      msg: 'credit_redeemed',
      purchaseId: purchase._id.toString(),
      customerId,
      creditsLeft: purchase.creditsLeft,
    });

    res.status(201).json({
      purchaseId: purchase._id.toString(),
      creditsLeft: purchase.creditsLeft,
      redemptionId: redemption._id.toString(),
      redemption,
    });
  } catch (err) {
    if (session) await session.abortTransaction().catch(() => {});
    next(err);
  } finally {
    if (session) await session.endSession().catch(() => {});
  }
}

// POST /redeem/qr-token
export async function createRedeemToken(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const { purchaseId } = req.body || {};
    assertObjectId(purchaseId, 'purchaseId');

    const purchase = await Purchase.findById(purchaseId).lean();
    if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found', 404);
    if (String(purchase.customerId) !== String(customerId)) {
      throw new AppError('FORBIDDEN', 'Not your purchase', 403);
    }
    if (purchase.creditsLeft <= 0) {
      throw new AppError('CONFLICT', 'No credits to redeem', 409);
    }

    const { token } = signRedeemToken({ purchaseId, customerId });
    res.status(201).json({ token, exp: process.env.QR_TTL_REDEEM || process.env.QR_TTL || '5m' });
  } catch (err) {
    next(err);
  }
}
