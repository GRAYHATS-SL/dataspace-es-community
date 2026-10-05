import { z } from 'zod';

const categoryBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
});

/** Form schema to create a category. */
export const categorySchema = categoryBaseSchema.superRefine(() => {
  // Here you define your business rules (naming rules, parent category constraints...).
});

/** Form values to create a category. */
export type CategoryFormData = z.infer<typeof categorySchema>;

/** Form schema to update a category (every field optional). */
export const updateCategorySchema = categoryBaseSchema.partial();

/** Form values to update a category. */
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
