import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

export const updateCategorySchema = categorySchema.partial();
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
