import { z } from 'zod';

export const createPickupWindowSchema = z.object({
  body: z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    capacity: z.number().int().positive()
  })
});

export const updatePickupWindowSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id'),
  }),
  body: z.object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    capacity: z.number().min(0).optional(),
    status: z.enum(['open', 'closed']).optional(),
    isActive: z.boolean().optional(),
    isDeleted: z.boolean().optional(),
    displayOrder: z.number().min(-1_000_000).max(1_000_000).optional(),
    notes: z.string().max(300).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  }),
});
