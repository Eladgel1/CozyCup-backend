import { z } from 'zod';

export const createPurchaseSchema = z.object({
  body: z.object({
    packageId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid packageId')
  })
});
