import { z } from 'zod';

import {
  blankToUndefined,
  productOfferingTermSchema,
  taxItemSchema,
  unitOfMeasureSchema,
} from './shared.schema';

/** Price types supported by the price forms. */
export const PRICE_TYPES = ['recurring', 'one time', 'usage'] as const;

const productOfferingPriceBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  priceType: z.enum(PRICE_TYPES, { error: 'Selecciona un tipo de precio' }),
  recurringChargePeriodType: z.string().optional(),
  recurringChargePeriodLength: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un número entero positivo').optional(),
  ),
  price: z.object({
    value: blankToUndefined(
      z.coerce
        .number({ error: 'El importe es obligatorio' })
        .min(0, 'El importe no puede ser negativo'),
    ),
    unit: z.string().min(1, 'La moneda es obligatoria').default('EUR'),
  }),
  productOfferingTerm: z.array(productOfferingTermSchema).optional(),
  unitOfMeasure: unitOfMeasureSchema.optional(),
  tax: z.array(taxItemSchema).optional(),
  // Dynamic pricing (form-only fields, never sent to the API as-is)
  pricingMode: z.enum(['fixed', 'dynamic']).optional(),
  supplyMode: z.enum(['limited', 'unlimited']).optional(),
  supply: blankToUndefined(
    z.coerce.number().int().positive('Debe ser un entero positivo').optional(),
  ),
  curve: z.coerce.number().positive('Debe ser un número positivo').optional(),
  sensitivity: z.coerce.number().positive('Debe ser un número positivo').optional(),
  floor: blankToUndefined(z.coerce.number().min(0, 'El suelo no puede ser negativo').optional()),
  cap: blankToUndefined(z.coerce.number().min(0, 'El techo no puede ser negativo').optional()),
});

/** Form schema to create a product offering price. */
export const productOfferingPriceSchema = productOfferingPriceBaseSchema.superRefine(() => {
  // Here you define your pricing rules (floor <= price <= cap, supply required when limited...).
});

/** Form values to create a product offering price. */
export type ProductOfferingPriceFormData = z.infer<typeof productOfferingPriceSchema>;

/** Form schema to update a product offering price (every field optional). */
export const updateProductOfferingPriceSchema = productOfferingPriceBaseSchema.partial();

/** Form values to update a product offering price. */
export type UpdateProductOfferingPriceFormData = z.infer<typeof updateProductOfferingPriceSchema>;
