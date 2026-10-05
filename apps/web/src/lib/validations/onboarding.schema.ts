import { z } from 'zod';

/** Validation schema of the public onboarding wizard. */
export const onboardingSchema = z.object({
  // Organization data
  organizationName: z.string().trim().min(1, 'El nombre de la organización es requerido'),
  country: z.string().min(1, 'El país es requerido'),
  website: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          new URL(`https://${val}`);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Introduce un sitio web válido (ej. ejemplo.com)' },
    ),
  contactName: z.string().trim().min(1, 'El nombre del contacto es requerido'),
  contactPosition: z.string().trim().optional(),
  // Here you define your business logic (e.g. reject personal email domains).
  contactEmail: z.email({ message: 'El correo electrónico no es válido' }),
  contactPhone: z.string().trim().min(1, 'El teléfono es requerido'),

  // Role selection
  role: z.enum(['consumer', 'producer', 'both'], { message: 'El rol es requerido' }),

  // Use case and data formats
  useCase: z.string().optional(),
  dataFormats: z.array(z.string()).optional(),

  // Legal acceptances
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar los términos y condiciones',
  }),
  acceptPrivacy: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar la política de privacidad',
  }),
  acceptProcessing: z.boolean().refine((val) => val === true, {
    message: 'Debe aceptar el tratamiento de datos',
  }),

  // Meeting scheduling
  meetingDate: z.string().optional(),
  meetingTime: z.string().optional(),

  // Additional comments
  comments: z.string().trim().optional(),
});

/** Values of the onboarding wizard. */
export type OnboardingFormData = z.infer<typeof onboardingSchema>;
