import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().refine(
  (val) => mongoose.Types.ObjectId.isValid(val),
  { message: 'Invalid ObjectId' }
);

export const createOrderSchema = z.object({
  body: z.object({
    items: z.array(z.object({
      menuItemId: objectIdSchema,
      quantity: z.number().int().positive()
    })).min(1),
    pickupWindowId: objectIdSchema.optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'WALLET'])
  })
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])
  })
});
