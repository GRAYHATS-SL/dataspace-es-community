import { z } from 'zod';

// An empty numeric input arrives as '' (string registration) or NaN (valueAsNumber registration). z.coerce.number() on '' gives 0 instead of failing; this preprocessor normalizes it to `undefined` before validating, so the wrapped schema decides the message (required or optional).
export const blankToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (val) =>
      val === '' || val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val))
        ? undefined
        : val,
    schema,
  );

export const validForSchema = z
  .object({
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.startDateTime && val.endDateTime) {
      if (new Date(val.endDateTime) <= new Date(val.startDateTime)) {
        ctx.addIssue({
          code: 'custom',
          message: 'La fecha de fin debe ser posterior a la de inicio',
          path: ['endDateTime'],
        });
      }
    }
  });

export const attachmentSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  url: z.url({ message: 'URL inválida' }),
  mimeType: z.string().optional(),
});

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

export const taxItemSchema = z.object({
  taxCategory: z.string().min(1, 'La categoría fiscal es obligatoria'),
  taxRate: blankToUndefined(
    z.coerce
      .number({ error: 'El tipo impositivo es obligatorio' })
      .min(0, 'El tipo impositivo no puede ser negativo')
      .max(100, 'El tipo impositivo no puede superar el 100%'),
  ),
});

export const unitOfMeasureSchema = z.object({
  amount: z.coerce.number().positive('Debe ser un número positivo'),
  units: z.string().min(1, 'La unidad es obligatoria'),
});

// Empty field -> undefined (instead of 0), so "no data" is not confused with a real score of 0.
export const optionalPercentageSchema = blankToUndefined(
  z.coerce.number().min(0, 'Debe estar entre 0 y 100').max(100, 'Debe estar entre 0 y 100').optional(),
);

export const requiredPercentageSchema = blankToUndefined(
  z.coerce
    .number({ error: 'Este campo es obligatorio' })
    .min(0, 'Debe estar entre 0 y 100')
    .max(100, 'Debe estar entre 0 y 100'),
);
