import { z } from 'zod';

const LIFECYCLE_STATUSES = [
  'In study',
  'In design',
  'In test',
  'Active',
  'Launched',
  'Retired',
  'Obsolete',
  'Rejected',
] as const;

const productOfferingBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  version: z.string().optional(),
  lifecycleStatus: z.enum(LIFECYCLE_STATUSES).optional(),
  isBundle: z.boolean().optional(),
  isSellable: z.boolean().optional(),
  category: z.string().optional(),
  productSpecification: z.string().optional(),
});

/** Form schema to create a product offering. */
export const productOfferingSchema = productOfferingBaseSchema.superRefine(() => {
  // Here you define your business rules (required references, cross-field checks...).
});

/** Form values to create a product offering. */
export type ProductOfferingFormData = z.infer<typeof productOfferingSchema>;

/** Form schema to update a product offering (every field optional). */
export const updateProductOfferingSchema = productOfferingBaseSchema.partial();

/** Form values to update a product offering. */
export type UpdateProductOfferingFormData = z.infer<typeof updateProductOfferingSchema>;
