import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: 'Invalid ObjectId' }
);

// POST /bookings
export const createBookingSchema = z.object({
  body: z.object({
    slotId: objectIdSchema,
    notes: z.string().max(300).optional()
  })
});

// PATCH /bookings/:id/cancel
export const cancelBookingSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
