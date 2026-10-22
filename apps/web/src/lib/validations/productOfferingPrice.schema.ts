import { z } from 'zod';

import {
  blankToUndefined,
  productOfferingTermSchema,
  taxItemSchema,
  unitOfMeasureSchema,
} from './shared.schema';

const productOfferingPriceBaseSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  priceType: z.enum(['recurring', 'one time', 'usage'], { error: 'Selecciona un tipo de precio' }),
  recurringChargePeriodType: z.string().optional(),
  recurringChargePeriodLength: z.coerce
    .number()
    .int()
    .positive('Debe ser un número entero positivo')
    .optional(),
  price: z.object({
    value: blankToUndefined(
      z.coerce.number({ error: 'El importe es obligatorio' }).min(0, 'El importe no puede ser negativo'),
    ),
    unit: z.literal('EUR').default('EUR'),
  }),
  productOfferingTerm: z.array(productOfferingTermSchema).optional(),
  unitOfMeasure: unitOfMeasureSchema.optional(),
  tax: z.array(taxItemSchema).optional(),
  // Token pricing (gaps.md decisions 2 and 5). All optional: only `PriceForm` uses them (always with a default value); other consumers of the schema (e.g. the price embedded in `OfferingForm`) ignore them unaffected.
  tokenPricingMode: z.enum(['fijo', 'dinamico']).optional(),
  /** UI only: decides whether `tokenSupply` is shown. */
  tokenSupplyMode: z.enum(['escaso', 'abundante']).optional(),
  tokenSupply: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un entero positivo').optional(),
  ),
  tokenGamma: z.coerce.number().positive('Debe ser un número positivo').optional(),
  tokenKd: z.coerce.number().positive('Debe ser un número positivo').optional(),
  tokenFloor: blankToUndefined(z.coerce.number().min(0, 'El suelo no puede ser negativo').optional()),
  tokenCap: blankToUndefined(z.coerce.number().min(0, 'El techo no puede ser negativo').optional()),
});

export const productOfferingPriceSchema = productOfferingPriceBaseSchema.superRefine((val, ctx) => {
  if (val.tokenPricingMode !== 'dinamico') return;
  if (val.tokenFloor == null || val.tokenCap == null) {
    ctx.addIssue({
      code: 'custom',
      message: 'El suelo y el techo son obligatorios en modo dinámico',
      path: ['tokenFloor'],
    });
    return;
  }
  if (val.tokenFloor > val.tokenCap) {
    ctx.addIssue({
      code: 'custom',
      message: 'El suelo no puede ser mayor que el techo',
      path: ['tokenFloor'],
    });
  }
  if (val.price.value < val.tokenFloor || val.price.value > val.tokenCap) {
    ctx.addIssue({
      code: 'custom',
      message: 'El precio base debe estar entre el suelo y el techo',
      path: ['price', 'value'],
    });
  }
  if (val.tokenSupplyMode === 'escaso' && !(val.tokenSupply && val.tokenSupply >= 1)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Indica cuántos tokens se emiten',
      path: ['tokenSupply'],
    });
  }
});

export type ProductOfferingPriceFormData = z.infer<typeof productOfferingPriceSchema>;

export const updateProductOfferingPriceSchema = productOfferingPriceBaseSchema.partial();
export type UpdateProductOfferingPriceFormData = z.infer<typeof updateProductOfferingPriceSchema>;
