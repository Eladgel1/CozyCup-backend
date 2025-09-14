import { z } from 'zod';

export const createPickupWindowSchema = z.object({
  body: z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    capacity: z.number().int().positive()
  })
});

export const updatePickupWindowSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    capacity: z.number().int().positive().optional()
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
});
