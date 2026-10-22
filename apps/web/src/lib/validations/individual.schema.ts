import { z } from 'zod';

export const individualProfileSchema = z.object({
  givenName: z.string().min(1, 'El nombre es obligatorio'),
  familyName: z.string().min(1, 'Los apellidos son obligatorios'),
  title: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
});

export type IndividualProfileFormData = z.infer<typeof individualProfileSchema>;
