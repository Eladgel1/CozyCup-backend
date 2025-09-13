import { Package } from '../models/package.model.js';
import { AppError } from '../middlewares/error.js';

export async function listPackages(limit, offset) {
  const filter = { isActive: true };
  const [items, total] = await Promise.all([
    Package.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Package.countDocuments(filter)
  ]);
  return { items, total };
}

export async function createPackage({ name, credits, price, isActive }) {
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
  return Package.create({
    name: name.trim().slice(0, 120),
    credits: nCredits,
    price: nPrice,
    isActive: Boolean(isActive ?? true)
  });
}
