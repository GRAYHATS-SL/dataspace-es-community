import { z } from 'zod';

/** Basic email schema. */
export const emailSchema = z.object({
  email: z.email({ message: 'Por favor ingresa un email válido' }).min(1, 'El email es requerido'),
});

/** Email + consent schema, with a honeypot field for spam protection. */
export const emailWithConsentSchema = z.object({
  email: z.email({ message: 'Por favor ingresa un email válido' }).min(1, 'El email es requerido'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
  // Honeypot
  fullName: z.string().optional(),
});

/** Values of `emailSchema`. */
export type EmailData = z.infer<typeof emailSchema>;
/** Values of `emailWithConsentSchema`. */
export type EmailWithConsentData = z.infer<typeof emailWithConsentSchema>;
