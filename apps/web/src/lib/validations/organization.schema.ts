import { z } from 'zod';

export const contractManagementSchema = z.object({
  address: z.string().url('Debe ser una URL válida'),
  clientId: z.string().min(1, 'El Client ID es obligatorio'),
  scopes: z.string().min(1, 'Los scopes son obligatorios'),
});

export type ContractManagementFormData = z.infer<typeof contractManagementSchema>;

export const stripeAccountSchema = z.object({
  stripeConnectAccountId: z
    .string()
    .min(1, 'El Stripe ID es obligatorio')
    .regex(/^acct_[A-Za-z0-9]+$/, 'Debe tener el formato acct_...'),
});

export type StripeAccountFormData = z.infer<typeof stripeAccountSchema>;

export const fiscalDataSchema = z.object({
  name: z.string().min(1, 'La razón social es obligatoria'),
  taxId: z
    .string()
    .min(1, 'El CIF es obligatorio')
    .regex(/^[A-Z]\d{7}[A-Z0-9]$/, 'Debe tener el formato de un CIF válido (p. ej. B12345678)'),
  street1: z.string().min(1, 'La dirección es obligatoria'),
  city: z.string().min(1, 'La ciudad es obligatoria'),
  postCode: z.string().min(1, 'El código postal es obligatorio'),
  country: z.string().min(1, 'El país es obligatorio'),
});

export type FiscalDataFormData = z.infer<typeof fiscalDataSchema>;
