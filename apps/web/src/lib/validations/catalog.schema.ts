import { z } from 'zod';

const catalogBaseSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  version: z.string().optional(),
  category: z.string().optional(),
  catalogType: z.string().optional(),
});

/** Form schema to create a catalog. */
export const catalogSchema = catalogBaseSchema.superRefine(() => {
  // Here you define your business rules (required category, naming rules...).
});

/** Form values to create a catalog. */
export type CatalogFormData = z.infer<typeof catalogSchema>;

/** Form schema to update a catalog (every field optional). */
export const updateCatalogSchema = catalogBaseSchema.partial();

/** Form values to update a catalog. */
export type UpdateCatalogFormData = z.infer<typeof updateCatalogSchema>;
