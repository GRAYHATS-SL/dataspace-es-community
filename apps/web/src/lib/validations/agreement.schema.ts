import { z } from 'zod';

/** Usage purpose options of an agreement. */
export const PURPOSE_OPTIONS = [
  { value: 'commercial', label: 'Comercial' },
  { value: 'research', label: 'Investigación' },
  { value: 'internal', label: 'Interno' },
  { value: 'educational', label: 'Educativo' },
  { value: 'other', label: 'Otro' },
] as const;

/** Form schema for the terms step of the agreement wizard. */
export const agreementTermsSchema = z.object({
  purpose: z.enum(['commercial', 'research', 'internal', 'educational', 'other']),
  canRedistribute: z.boolean(),
  requiresPayment: z.boolean(),
  requiresAttribution: z.boolean(),
  canCreateDerivatives: z.boolean(),
  geographicRestrictions: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customTerms: z.array(
    z.object({ description: z.string().min(1, 'El término no puede estar vacío') }),
  ),
});

/** Form values of the agreement terms step. */
export type AgreementTermsFormData = z.infer<typeof agreementTermsSchema>;

/** Default values of the agreement terms step. */
export const DEFAULT_AGREEMENT_TERMS: AgreementTermsFormData = {
  purpose: 'commercial',
  canRedistribute: false,
  requiresPayment: false,
  requiresAttribution: true,
  canCreateDerivatives: false,
  geographicRestrictions: '',
  startDate: '',
  endDate: '',
  customTerms: [],
};
