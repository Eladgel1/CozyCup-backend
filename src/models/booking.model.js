import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
  {
    slotId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: { type: String, enum: ['BOOKED', 'CANCELLED'], default: 'BOOKED', index: true },

    // audit
    notes:       { type: String, default: '', maxlength: 300 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: [null, 'customer', 'host'], default: null },

    // denormalized for sorting/policy checks
    slotStartAt: { type: Date, required: true, index: true },
    slotEndAt:   { type: Date, required: true }
  },
  { timestamps: true }
);

BookingSchema.index({ customerId: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', BookingSchema);
