import { z } from 'zod';

/** Email validation schemas. */

// Basic email validation
export const emailSchema = z.object({
  email: z.email({ message: 'Por favor ingresa un email válido' }).min(1, 'El email es requerido'),
});

// Corporate email validation (stricter)
export const corporateEmailSchema = z.object({
  email: z
    .email({ message: 'Por favor ingresa un email válido' })
    .min(1, 'El email corporativo es requerido')
    .refine(
      (email) => {
        // Common non-corporate domains
        const personalDomains = [
          'gmail.com',
          'hotmail.com',
          'yahoo.com',
          'outlook.com',
          'icloud.com',
        ];
        const domain = email.split('@')[1]?.toLowerCase();
        return !personalDomains.includes(domain);
      },
      {
        message: 'Por favor usa tu email corporativo o institucional',
      },
    ),
});

// Validation with terms and conditions
export const emailWithConsentSchema = z.object({
  email: z.email({ message: 'Por favor ingresa un email válido' }).min(1, 'El email es requerido'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
  // Honeypot for anti-spam
  fullName: z.string().optional(),
});

// Derived types
export type EmailData = z.infer<typeof emailSchema>;
export type CorporateEmailData = z.infer<typeof corporateEmailSchema>;
export type EmailWithConsentData = z.infer<typeof emailWithConsentSchema>;
