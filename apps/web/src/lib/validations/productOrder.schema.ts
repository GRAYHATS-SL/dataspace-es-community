import { z } from 'zod';

/** Form schema for the order details step of the checkout. */
export const orderDetailsSchema = z.object({
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1'),
  description: z.string().optional(),
  requestedStartDate: z.string().optional(),
  requestedCompletionDate: z.string().optional(),
  priority: z.string().optional(),
});

/** Form values of the order details step. */
export type OrderDetailsFormData = z.infer<typeof orderDetailsSchema>;
