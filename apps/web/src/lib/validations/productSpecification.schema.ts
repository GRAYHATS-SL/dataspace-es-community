import { z } from 'zod';

import { isValidRegex, OFFER_ID_PATTERN } from '@/lib/utils/productSpecPolicy';

import {
  attachmentSchema,
  blankToUndefined,
  requiredPercentageSchema,
  validForSchema,
} from './shared.schema';

export const productSpecCharacteristicSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  valueType: z.enum(['string', 'number', 'boolean', 'object']).optional(),
  configurable: z.boolean().optional(),
  isUnique: z.boolean().optional(),
});

export type ProductSpecCharacteristicFormData = z.infer<typeof productSpecCharacteristicSchema>;

const productSpecificationBaseSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  brand: z.string().optional(),
  lifecycleStatus: z
    .enum(['Active', 'In design', 'In test', 'Launched', 'Retired', 'Obsolete'])
    .optional(),
  isBundle: z.boolean().optional(),
  productNumber: z.string().optional(),
  resourceSpecification: z.array(z.string()).optional(),
  serviceSpecification: z.array(z.string()).optional(),
  attachment: z.array(attachmentSchema).optional(),
  validFor: validForSchema.optional(),
  // Access policy v2 (ODRL). The action (`odrl:use`) and the credential (`ConsumerCredential`) are fixed.
  odrlPathRegex: z.string().optional(),
  odrlOfferId: z.string().optional(),
  odrlBytesLimit: blankToUndefined(
    z.coerce.number().int('Debe ser un entero').positive('Debe ser un entero positivo').optional(),
  ),
  odrlRequestsLimit: blankToUndefined(
    z.coerce.number().int('Debe ser un entero').positive('Debe ser un entero positivo').optional(),
  ),
  distributions: z.string().optional(),
  standard: z.string().optional(),
  license: z.string().optional(),
  accuracy: requiredPercentageSchema,
  completeness: requiredPercentageSchema,
  consistency: requiredPercentageSchema,
  credibility: requiredPercentageSchema,
  timeliness: requiredPercentageSchema,
  // Access tokenization limits. The price mode (fixed/dynamic) lives in `productOfferingPrice.schema.ts` -- it is 100% pricing, not part of the specification.
  tokenized: z.boolean().optional(),
  tokenMaxRequests: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un entero positivo').optional(),
  ),
  tokenMaxTransferTB: blankToUndefined(
    z.coerce.number().positive('Debe ser un número positivo').optional(),
  ),
  tokenSupplyMode: z.enum(['escaso', 'abundante']).optional(),
  tokenSupply: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un entero positivo').optional(),
  ),
});

type PolicyFields = Pick<
  z.infer<typeof productSpecificationBaseSchema>,
  'odrlPathRegex' | 'odrlOfferId' | 'odrlBytesLimit' | 'odrlRequestsLimit'
>;

// Access policy v2 rules: mandatory, compilable regex; `offerId` with conservative format; limits require `offerId` (without it the provider rejects the policy) and vice versa.
const refinePolicy = (val: PolicyFields, ctx: z.RefinementCtx) => {
  const regex = val.odrlPathRegex?.trim();
  if (!regex) {
    ctx.addIssue({
      code: 'custom',
      message: 'La regex de rutas es obligatoria',
      path: ['odrlPathRegex'],
    });
  } else if (!isValidRegex(regex)) {
    ctx.addIssue({
      code: 'custom',
      message: 'La regex de rutas no es válida',
      path: ['odrlPathRegex'],
    });
  }

  const offerId = val.odrlOfferId?.trim();
  const hasLimit = val.odrlBytesLimit !== undefined || val.odrlRequestsLimit !== undefined;
  if (offerId && !OFFER_ID_PATTERN.test(offerId)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Solo letras, números y guiones (máx. 64), empezando por letra o número',
      path: ['odrlOfferId'],
    });
  }
  if (!offerId && hasLimit) {
    ctx.addIssue({
      code: 'custom',
      message: 'Los límites exigen un identificador de oferta',
      path: ['odrlOfferId'],
    });
  }
  if (offerId && !hasLimit) {
    ctx.addIssue({
      code: 'custom',
      message: 'Una oferta medida necesita al menos un límite (bytes o peticiones)',
      path: ['odrlBytesLimit'],
    });
  }
};

export const productSpecificationSchema = productSpecificationBaseSchema.superRefine((val, ctx) => {
  refinePolicy(val, ctx);
  if (!val.tokenized) return;
  if (!val.tokenMaxRequests) {
    ctx.addIssue({
      code: 'custom',
      message: 'El límite de peticiones es obligatorio',
      path: ['tokenMaxRequests'],
    });
  }
  if (!val.tokenMaxTransferTB) {
    ctx.addIssue({
      code: 'custom',
      message: 'El límite de transferencia es obligatorio',
      path: ['tokenMaxTransferTB'],
    });
  }
  if (val.tokenSupplyMode === 'escaso' && !(val.tokenSupply && val.tokenSupply >= 1)) {
    ctx.addIssue({
      code: 'custom',
      message: 'El suministro debe ser al menos 1',
      path: ['tokenSupply'],
    });
  }
});

export type ProductSpecificationFormData = z.infer<typeof productSpecificationSchema>;

export const updateProductSpecificationSchema = productSpecificationBaseSchema
  .partial()
  .superRefine(refinePolicy);
export type UpdateProductSpecificationFormData = z.infer<typeof updateProductSpecificationSchema>;
