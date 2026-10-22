import { z } from 'zod';

export const PURPOSE_OPTIONS = [
  { value: 'commercial', label: 'Comercial' },
  { value: 'research', label: 'Investigación' },
  { value: 'internal', label: 'Interno' },
  { value: 'educational', label: 'Educativo' },
  { value: 'other', label: 'Otro' },
] as const;

export const PURPOSE_VALUES = PURPOSE_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const agreementTermsSchema = z.object({
  purpose: z
    .enum(['commercial', 'research', 'internal', 'educational', 'other'])
    .default('commercial'),
  canRedistribute: z.boolean().default(false),
  requiresPayment: z.boolean().default(false),
  requiresAttribution: z.boolean().default(true),
  canCreateDerivatives: z.boolean().default(false),
  geographicRestrictions: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customTerms: z
    .array(z.object({ description: z.string().min(1, 'El término no puede estar vacío') }))
    .default([]),
});

export type AgreementTermsFormData = z.infer<typeof agreementTermsSchema>;

export const DEFAULT_AGREEMENT_TERMS: AgreementTermsFormData = {
  purpose: 'commercial',
  canRedistribute: false,
  requiresPayment: false,
  requiresAttribution: true,
  canCreateDerivatives: false,
  customTerms: [],
};
