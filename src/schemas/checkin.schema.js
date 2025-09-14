import { z } from 'zod';

export const checkinSchema = z.object({
  params: z.object({
    token: z.string().min(10, 'Invalid token format')
  })
});
