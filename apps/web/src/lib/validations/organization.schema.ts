import { z } from 'zod';

/** Validation schema of the external integration settings of an organization. */
export const integrationSettingsSchema = z.object({
  address: z.url('Debe ser una URL válida'),
  clientId: z.string().min(1, 'El Client ID es obligatorio'),
  scopes: z.string().min(1, 'Los scopes son obligatorios'),
});

/** Values of `integrationSettingsSchema`. */
export type IntegrationSettingsFormData = z.infer<typeof integrationSettingsSchema>;

/** Validation schema of the payout account form. */
export const payoutAccountSchema = z.object({
  // Here you define your business logic (payment provider account id format).
  payoutAccountId: z.string().trim().min(1, 'El identificador de la cuenta es obligatorio'),
});

/** Values of `payoutAccountSchema`. */
export type PayoutAccountFormData = z.infer<typeof payoutAccountSchema>;

/** Validation schema of the organization fiscal data form. */
export const fiscalDataSchema = z.object({
  name: z.string().min(1, 'La razón social es obligatoria'),
  // Here you define your business logic (tax id format of your jurisdiction).
  taxId: z.string().trim().min(1, 'El identificador fiscal es obligatorio'),
  street1: z.string().min(1, 'La dirección es obligatoria'),
  city: z.string().min(1, 'La ciudad es obligatoria'),
  postCode: z.string().min(1, 'El código postal es obligatorio'),
  country: z.string().min(1, 'El país es obligatorio'),
});

/** Values of `fiscalDataSchema`. */
export type FiscalDataFormData = z.infer<typeof fiscalDataSchema>;
