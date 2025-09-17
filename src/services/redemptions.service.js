import mongoose from 'mongoose';
import { Purchase } from '../models/purchase.model.js';
import { Redemption } from '../models/redemption.model.js';
import { AppError } from '../middlewares/error.js';

export async function redeemCredit({ customerId, purchaseId }) {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const purchase = await Purchase.findOne({ _id: purchaseId, customerId }).session(session);
    if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found', 404);
    if (purchase.creditsLeft <= 0) throw new AppError('CONFLICT', 'No credits left', 409);

    purchase.creditsLeft -= 1;
    await purchase.save({ session });

    const [redemption] = await Redemption.create([{ customerId, purchaseId }], { session });

    await session.commitTransaction();
    return { redemption, creditsLeft: purchase.creditsLeft };
  } catch (err) {
    // Fallback if no replica set / transactions unsupported
    if (err?.code === 20 /* IllegalOperation */) {
      const purchase = await Purchase.findOne({ _id: purchaseId, customerId });
      if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found', 404);
      if (purchase.creditsLeft <= 0) throw new AppError('CONFLICT', 'No credits left', 409);

      purchase.creditsLeft -= 1;
      await purchase.save();

      const redemption = await Redemption.create({ customerId, purchaseId });
      return { redemption, creditsLeft: purchase.creditsLeft };
    }
    throw err;
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch {
        /* ignore */
      }
    }
  }
}
