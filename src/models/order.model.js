import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true, trim: true }, // snapshot
    priceCents: { type: Number, required: true, min: 0 }, // snapshot
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // optional customization snapshot:
    variants: { type: Array, default: [] }, // e.g. chosen size, extras
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    pickupWindowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PickupWindow',
      required: true,
      index: true,
    },

    items: { type: [OrderItemSchema], required: true, validate: (v) => v.length > 0 },

    subtotalCents: { type: Number, required: true, min: 0 },
    discountCents: { type: Number, required: true, min: 0, default: 0 },
    totalCents: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['CONFIRMED', 'IN_PREP', 'READY', 'PICKED_UP', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true,
    },

    // audit
    notes: { type: String, default: '', maxlength: 300 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: [null, 'customer', 'host'], default: null },

    // denormalized to speed up "my orders" sorting
    windowStartAt: { type: Date, required: true, index: true },
    windowEndAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', OrderSchema);
