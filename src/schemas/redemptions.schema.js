import { z } from 'zod';
import mongoose from 'mongoose';

const objectId = z
  .string()
  .refine(mongoose.Types.ObjectId.isValid, { message: 'Invalid ObjectId' });

export const redeemSchema = z.object({
  body: z
    .object({
      purchaseId: objectId.optional(),
      token: z.string().optional(),
    })
    .refine((data) => data.purchaseId || data.token, {
      message: 'Either purchaseId or token is required',
    }),
});

export const createRedeemTokenSchema = z.object({
  body: z
    .object({
      purchaseId: objectId,
    })
    .strict(),
});
