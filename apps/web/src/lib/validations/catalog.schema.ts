import { z } from 'zod';

export const catalogSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  version: z.string().optional(),
  category: z.string().optional(),
  catalogType: z.string().optional(),
});

export type CatalogFormData = z.infer<typeof catalogSchema>;

export const updateCatalogSchema = catalogSchema.partial();
export type UpdateCatalogFormData = z.infer<typeof updateCatalogSchema>;
