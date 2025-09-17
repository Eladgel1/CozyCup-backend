import { z } from 'zod';

export const createPackageSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    credits: z.number().int().positive(),
    price: z.number().positive(),
    isActive: z.boolean().optional(),
  }),
});
