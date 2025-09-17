import mongoose from 'mongoose';

const VariantOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    priceDeltaCents: { type: Number, default: 0, min: -1_000_00, max: 1_000_00 }, // cents delta
  },
  { _id: false }
);

const VariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    options: { type: [VariantOptionSchema], default: [] },
  },
  { _id: false }
);

const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    priceCents: { type: Number, required: true, min: 0 }, // store money in cents (kept)
    description: { type: String, default: '', trim: true, maxlength: 500 },
    imageUrl: { type: String, default: '' },
    category: { type: String, default: '', trim: true, maxlength: 40 },
    isActive: { type: Boolean, default: true, index: true }, // kept

    // --- Additions (non-breaking) ---
    currency: { type: String, default: 'ILS', minlength: 3, maxlength: 3 },
    displayOrder: { type: Number, default: 0, index: true },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    allergens: [{ type: String, trim: true, maxlength: 30 }],
    variants: { type: [VariantSchema], default: [] },

    // Soft delete flag (keeps historical data without removing documents)
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Existing + enhanced indexes for common queries
MenuItemSchema.index({ isActive: 1, name: 1 });
MenuItemSchema.index({ isActive: 1, isDeleted: 1, category: 1, displayOrder: 1 });
MenuItemSchema.index({ name: 'text', description: 'text' }); // simple full-text search

export const MenuItem = mongoose.model('MenuItem', MenuItemSchema);
