import mongoose from 'mongoose';

const PackageSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true, maxlength: 120, index: true },
    credits:  { type: Number, required: true, min: 1 },
    price:    { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

// Helpful compound index for listings
PackageSchema.index({ isActive: 1, createdAt: -1 });

export const Package = mongoose.model('Package', PackageSchema);
