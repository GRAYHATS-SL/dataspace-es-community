import { z } from 'zod';

import {
  attachmentSchema,
  blankToUndefined,
  characteristicSchema,
  SPEC_LIFECYCLE_STATUSES,
  validForSchema,
} from './shared.schema';

/** Characteristic row of a product specification. */
export const productSpecCharacteristicSchema = characteristicSchema.omit({ value: true });

/** Characteristic row values of a product specification. */
export type ProductSpecCharacteristicFormData = z.infer<typeof productSpecCharacteristicSchema>;

const productSpecificationBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  brand: z.string().optional(),
  lifecycleStatus: z.enum(SPEC_LIFECYCLE_STATUSES).optional(),
  isBundle: z.boolean().optional(),
  productNumber: z.string().optional(),
  resourceSpecification: z.array(z.string()).optional(),
  serviceSpecification: z.array(z.string()).optional(),
  attachment: z.array(attachmentSchema).optional(),
  validFor: validForSchema.optional(),
  // Access tokenization
  tokenized: z.boolean().optional(),
  tokenMaxRequests: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un entero positivo').optional(),
  ),
  tokenMaxTransferTB: blankToUndefined(
    z.coerce.number().positive('Debe ser un número positivo').optional(),
  ),
  tokenSupplyMode: z.enum(['limited', 'unlimited']).optional(),
  tokenSupply: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un entero positivo').optional(),
  ),
});

/** Form schema to create a product specification. */
export const productSpecificationSchema = productSpecificationBaseSchema.superRefine(() => {
  // Here you define your business rules (tokenization limits required when enabled...).
});

/** Form values to create a product specification. */
export type ProductSpecificationFormData = z.infer<typeof productSpecificationSchema>;

/** Form schema to update a product specification (every field optional). */
export const updateProductSpecificationSchema = productSpecificationBaseSchema.partial();

/** Form values to update a product specification. */
export type UpdateProductSpecificationFormData = z.infer<typeof updateProductSpecificationSchema>;
