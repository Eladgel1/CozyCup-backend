import mongoose from 'mongoose';

const RedemptionSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true, index: true },
    redeemedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// For quick lookups by customer and time
RedemptionSchema.index({ customerId: 1, redeemedAt: -1 });

export const Redemption = mongoose.model('Redemption', RedemptionSchema);
