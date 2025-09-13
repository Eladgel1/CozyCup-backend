import { Package } from '../models/package.model.js';
import { Purchase } from '../models/purchase.model.js';
import { AppError } from '../middlewares/error.js';

export async function createPurchase({ customerId, packageId, paymentMethod }) {
  const pkg = await Package.findOne({ _id: packageId, isActive: true }).lean();
  if (!pkg) throw new AppError('NOT_FOUND', 'Package not found/active', 404);

  return Purchase.create({
    customerId,
    packageId,
    creditsLeft: pkg.credits,
    paymentMethod: paymentMethod === 'CASH' ? 'CASH' : 'MOCK'
  });
}

export async function getWallet(customerId, limit, offset) {
  const [items, total] = await Promise.all([
    Purchase.find({ customerId })
      .populate('packageId')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Purchase.countDocuments({ customerId })
  ]);
  return { items, total };
}
