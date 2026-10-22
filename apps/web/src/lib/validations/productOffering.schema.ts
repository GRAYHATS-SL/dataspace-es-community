import { z } from 'zod';

import { attachmentSchema, productOfferingTermSchema } from './shared.schema';

export const productOfferingSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  version: z.string().optional(),
  lifecycleStatus: z
    .enum(['Active', 'In design', 'In test', 'Launched', 'Retired', 'Obsolete'])
    .optional(),
  category: z.string().optional(),
  productSpecification: z
    .string({ error: 'La especificación es obligatoria' })
    .min(1, 'La especificación es obligatoria'),
  productOfferingPrice: z.array(z.string()).optional(),
  productOfferingTerm: z.array(productOfferingTermSchema).optional(),
  attachment: z.array(attachmentSchema).optional(),
  place: z.array(z.string()).optional(),
});

export type ProductOfferingFormData = z.infer<typeof productOfferingSchema>;

export const updateProductOfferingSchema = productOfferingSchema.partial();
export type UpdateProductOfferingFormData = z.infer<typeof updateProductOfferingSchema>;
