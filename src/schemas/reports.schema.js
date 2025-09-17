import { z } from 'zod';

export const daySummarySchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});
