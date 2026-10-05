import { z } from 'zod';

/**
 * Normalizes blank numeric inputs (`''`, `NaN`, `null`) to `undefined` before validating,
 * so the wrapped schema decides whether the value is required or optional.
 */
export const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) =>
      val === '' ||
      val === undefined ||
      val === null ||
      (typeof val === 'number' && Number.isNaN(val))
        ? undefined
        : val,
    schema,
  );

/** Validity period (start/end date). */
export const validForSchema = z
  .object({
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
  })
  .superRefine(() => {
    // Here you define your business rules (e.g. end date after start date).
  });

/** Attachment (name + URL). */
export const attachmentSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  url: z.url({ message: 'URL inválida' }),
  mimeType: z.string().optional(),
});

/** Commitment term of an offering or price. */
export const productOfferingTermSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  duration: z
    .object({
      amount: z.coerce.number().int().positive('Debe ser un número positivo'),
      units: z.enum(['day', 'month', 'year']),
    })
    .optional(),
});

/** Tax item of a price (category + rate). */
export const taxItemSchema = z.object({
  taxCategory: z.string().min(1, 'La categoría fiscal es obligatoria'),
  taxRate: blankToUndefined(
    z.coerce
      .number({ error: 'El tipo impositivo es obligatorio' })
      .min(0, 'El tipo impositivo no puede ser negativo')
      .max(100, 'El tipo impositivo no puede superar el 100%'),
  ),
});

/** Unit of measure (amount + units). */
export const unitOfMeasureSchema = z.object({
  amount: z.coerce.number().positive('Debe ser un número positivo'),
  units: z.string().min(1, 'La unidad es obligatoria'),
});

/** Optional 0-100 percentage; a blank input becomes `undefined`. */
export const optionalPercentageSchema = blankToUndefined(
  z.coerce
    .number()
    .min(0, 'Debe estar entre 0 y 100')
    .max(100, 'Debe estar entre 0 y 100')
    .optional(),
);

/** Lifecycle statuses selectable in the specification forms. */
export const SPEC_LIFECYCLE_STATUSES = [
  'Active',
  'In design',
  'In test',
  'Launched',
  'Retired',
  'Obsolete',
] as const;

/** Characteristic row edited by `CharacteristicsArrayField`. */
export const characteristicSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  valueType: z.enum(['string', 'number', 'boolean', 'object']).optional(),
  configurable: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  value: z.string().optional(),
});

/** Characteristic row values. */
export type CharacteristicFormData = z.infer<typeof characteristicSchema>;
