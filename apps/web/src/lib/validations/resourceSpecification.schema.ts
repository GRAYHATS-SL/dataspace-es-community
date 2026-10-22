import { z } from 'zod';

export const resourceSpecCharacteristicSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  valueType: z.enum(['string', 'number', 'boolean', 'object']).optional(),
  configurable: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  value: z.string().optional(),
});

export type ResourceSpecCharacteristicFormData = z.infer<typeof resourceSpecCharacteristicSchema>;

export const resourceSpecificationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  lifecycleStatus: z
    .enum(['Active', 'In design', 'In test', 'Launched', 'Retired', 'Obsolete'])
    .optional(),
  category: z.string().optional(),
  resourceSpecCharacteristic: z.array(resourceSpecCharacteristicSchema).optional(),
});

export type ResourceSpecificationFormData = z.infer<typeof resourceSpecificationSchema>;

export const updateResourceSpecificationSchema = resourceSpecificationSchema.partial();
export type UpdateResourceSpecificationFormData = z.infer<typeof updateResourceSpecificationSchema>;
