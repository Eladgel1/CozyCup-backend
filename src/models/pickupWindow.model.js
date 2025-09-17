import mongoose from 'mongoose';

const PickupWindowSchema = new mongoose.Schema(
  {
    // Window bounds
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },

    // Capacity controls how many orders can be placed into this window
    capacity: { type: Number, required: true, min: 0 },

    // Denormalized counter for future modules (orders/bookings)
    bookedCount: { type: Number, default: 0, min: 0 },

    // Operational status
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },

    // Host controls
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },

    // Optional metadata
    notes: { type: String, default: '', trim: true, maxlength: 300 },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

// Basic integrity check at schema-level (Mongoose validation)
PickupWindowSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    return next(new Error('startAt must be earlier than endAt'));
  }
  if (this.bookedCount > this.capacity) {
    return next(new Error('bookedCount cannot exceed capacity'));
  }
  next();
});

// Common query pattern: open windows within a range and active
PickupWindowSchema.index({ status: 1, isActive: 1, isDeleted: 1, startAt: 1, endAt: 1 });

export const PickupWindow = mongoose.model('PickupWindow', PickupWindowSchema);
