import { z } from 'zod';

/** Form schema for a review comment (rating 1-5 + optional text). */
export const reviewCommentSchema = z.object({
  rating: z
    .number()
    .int('La valoración debe ser un número entero')
    .min(1, 'Selecciona una valoración de 1 a 5 estrellas')
    .max(5, 'La valoración máxima es 5 estrellas'),
  body: z.string().max(1000, 'El comentario no puede superar los 1000 caracteres').optional(),
});

/** Form values of a review comment. */
export type ReviewCommentFormData = z.infer<typeof reviewCommentSchema>;
