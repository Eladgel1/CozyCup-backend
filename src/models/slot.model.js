import mongoose from 'mongoose';

const SlotSchema = new mongoose.Schema(
  {
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },

    capacity: { type: Number, required: true, min: 0 },
    bookedCount: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },

    notes: { type: String, default: '', trim: true, maxlength: 300 },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

SlotSchema.pre('validate', function (next) {
  if (this.startAt && this.endAt && this.startAt >= this.endAt) {
    return next(new Error('startAt must be earlier than endAt'));
  }
  if ((this.bookedCount ?? 0) > (this.capacity ?? 0)) {
    return next(new Error('bookedCount cannot exceed capacity'));
  }
  next();
});

SlotSchema.index({ status: 1, isActive: 1, isDeleted: 1, startAt: 1, endAt: 1 });

export const Slot = mongoose.model('Slot', SlotSchema);
