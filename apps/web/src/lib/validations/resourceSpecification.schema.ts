import { z } from 'zod';

import { characteristicSchema, SPEC_LIFECYCLE_STATUSES } from './shared.schema';

/** Characteristic row of a resource specification. */
export const resourceSpecCharacteristicSchema = characteristicSchema;

/** Characteristic row values of a resource specification. */
export type ResourceSpecCharacteristicFormData = z.infer<typeof resourceSpecCharacteristicSchema>;

const resourceSpecificationBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  lifecycleStatus: z.enum(SPEC_LIFECYCLE_STATUSES).optional(),
  category: z.string().optional(),
  resourceSpecCharacteristic: z.array(resourceSpecCharacteristicSchema).optional(),
});

/** Form schema to create a resource specification. */
export const resourceSpecificationSchema = resourceSpecificationBaseSchema.superRefine(() => {
  // Here you define your business rules (unique characteristic names...).
});

/** Form values to create a resource specification. */
export type ResourceSpecificationFormData = z.infer<typeof resourceSpecificationSchema>;

/** Form schema to update a resource specification (every field optional). */
export const updateResourceSpecificationSchema = resourceSpecificationBaseSchema.partial();

/** Form values to update a resource specification. */
export type UpdateResourceSpecificationFormData = z.infer<typeof updateResourceSpecificationSchema>;
