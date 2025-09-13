import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema(
  {
    customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    packageId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true, index: true },
    creditsLeft: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['CASH', 'MOCK'], default: 'MOCK' }
  },
  { timestamps: true }
);

// Common access pattern: customer's active / recent purchases
PurchaseSchema.index({ customerId: 1, createdAt: -1 });

export const Purchase = mongoose.model('Purchase', PurchaseSchema);
