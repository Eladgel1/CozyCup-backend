import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    priceCents: { type: Number, required: true, min: 0 }, // store money in cents
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    category: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

MenuItemSchema.index({ isActive: 1, name: 1 });

export const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
