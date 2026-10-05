import { z } from 'zod';

import { characteristicSchema, SPEC_LIFECYCLE_STATUSES } from './shared.schema';

/** Characteristic row of a service specification. */
export const serviceSpecCharacteristicSchema = characteristicSchema.omit({ value: true });

/** Characteristic row values of a service specification. */
export type ServiceSpecCharacteristicFormData = z.infer<typeof serviceSpecCharacteristicSchema>;

/** Reference to a service level specification. */
export const serviceLevelSpecificationSchema = z.object({
  id: z.string().min(1, 'El ID es obligatorio'),
  name: z.string().optional(),
});

/** HTTP methods selectable for a service endpoint. */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** Authentication types selectable for a service endpoint. */
export const AUTH_TYPES = ['none', 'apiKey', 'bearer', 'oauth2', 'basic'] as const;

const serviceSpecificationBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  lifecycleStatus: z.enum(SPEC_LIFECYCLE_STATUSES).optional(),
  endpoint: z.url('URL inválida').or(z.literal('')).optional(),
  httpMethod: z.enum(HTTP_METHODS).optional(),
  responseFormat: z.string().optional(),
  authType: z.enum(AUTH_TYPES).optional(),
  accessInstructions: z.string().optional(),
});

/** Form schema to create a service specification. */
export const serviceSpecificationSchema = serviceSpecificationBaseSchema.superRefine(() => {
  // Here you define your business rules (e.g. endpoint required for some auth types).
});

/** Form values to create a service specification. */
export type ServiceSpecificationFormData = z.infer<typeof serviceSpecificationSchema>;

/** Form schema to update a service specification (every field optional). */
export const updateServiceSpecificationSchema = serviceSpecificationBaseSchema.partial();

/** Form values to update a service specification. */
export type UpdateServiceSpecificationFormData = z.infer<typeof updateServiceSpecificationSchema>;
