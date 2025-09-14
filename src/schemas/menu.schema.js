import { z } from 'zod';

export const createMenuItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    price: z.number().positive(),
    category: z.string().min(1).max(50),
    isActive: z.boolean().optional().default(true)
  })
});

export const updateMenuItemSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    price: z.number().positive().optional(),
    category: z.string().min(1).max(50).optional(),
    isActive: z.boolean().optional()
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided'
  })
});
