import { z } from 'zod';

export const reviewCommentSchema = z.object({
  rating: z
    .number()
    .int('La valoración debe ser un número entero')
    .min(1, 'Selecciona una valoración de 1 a 5 estrellas')
    .max(5, 'La valoración máxima es 5 estrellas'),
  body: z.string().max(1000, 'El comentario no puede superar los 1000 caracteres').optional(),
});

export type ReviewCommentFormData = z.infer<typeof reviewCommentSchema>;
