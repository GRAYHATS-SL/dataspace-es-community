import { z } from 'zod';

export const serviceSpecCharacteristicSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  valueType: z.enum(['string', 'number', 'boolean', 'object']).optional(),
  configurable: z.boolean().optional(),
  isUnique: z.boolean().optional(),
});

export type ServiceSpecCharacteristicFormData = z.infer<typeof serviceSpecCharacteristicSchema>;

export const serviceLevelSpecificationSchema = z.object({
  id: z.string().min(1, 'El ID es obligatorio'),
  name: z.string().optional(),
});

export const serviceSpecificationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  lifecycleStatus: z
    .enum(['Active', 'In design', 'In test', 'Launched', 'Retired', 'Obsolete'])
    .optional(),
  endpoint: z.string().url('URL inválida').or(z.literal('')).optional(),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  responseFormat: z.string().optional(),
  authType: z.enum(['none', 'apiKey', 'bearer', 'oauth2', 'basic']).optional(),
  accessInstructions: z.string().optional(),
});

export type ServiceSpecificationFormData = z.infer<typeof serviceSpecificationSchema>;

export const updateServiceSpecificationSchema = serviceSpecificationSchema.partial();
export type UpdateServiceSpecificationFormData = z.infer<typeof updateServiceSpecificationSchema>;
