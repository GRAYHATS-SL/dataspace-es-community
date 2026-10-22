import { z } from 'zod';

export const productOrderSchema = z.object({
  productOfferingId: z.string().min(1, 'El producto es obligatorio'),
  quantity: z.number().int().min(1, 'La cantidad debe ser al menos 1').default(1),
  description: z.string().optional(),
  requestedStartDate: z.string().optional(),
  requestedCompletionDate: z.string().optional(),
  priority: z.string().optional(),
});

export type ProductOrderFormData = z.infer<typeof productOrderSchema>;

export const orderDetailsSchema = productOrderSchema.omit({ productOfferingId: true });
export type OrderDetailsFormData = z.infer<typeof orderDetailsSchema>;

export const updateProductOrderSchema = productOrderSchema.partial();
export type UpdateProductOrderFormData = z.infer<typeof updateProductOrderSchema>;
