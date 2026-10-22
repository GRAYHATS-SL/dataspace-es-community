import AgreementCustomTermsField from '@/components/molecules/AgreementCustomTermsField';
import type { SmartFormField } from '@/components/organisms/SmartForm';
import { type AgreementTermsFormData, PURPOSE_OPTIONS } from '@/lib/validations/agreement.schema';

export type Step = 'parties' | 'terms' | 'confirm';

export const STEPS: Step[] = ['parties', 'terms', 'confirm'];
export const STEP_LABELS: Record<Step, string> = {
  parties: 'Partes',
  terms: 'Términos',
  confirm: 'Confirmación',
};

const PURPOSE_SELECT_OPTIONS = PURPOSE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const TERMS_FIELDS: SmartFormField<AgreementTermsFormData>[] = [
  {
    name: 'purpose',
    type: 'select',
    label: 'Propósito de uso',
    required: true,
    options: PURPOSE_SELECT_OPTIONS,
    wrapperClassName: 'sm:col-span-2',
  },
  {
    name: 'startDate',
    type: 'text',
    label: 'Inicio de vigencia',
    props: { type: 'date' },
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'endDate',
    type: 'text',
    label: 'Fin de vigencia',
    props: { type: 'date' },
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'canRedistribute',
    type: 'checkbox',
    label: 'Permite redistribución',
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'requiresPayment',
    type: 'checkbox',
    label: 'Requiere pago',
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'requiresAttribution',
    type: 'checkbox',
    label: 'Requiere atribución',
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'canCreateDerivatives',
    type: 'checkbox',
    label: 'Permite obras derivadas',
    wrapperClassName: 'sm:col-span-1',
  },
  {
    name: 'geographicRestrictions',
    type: 'text',
    label: 'Restricciones geográficas',
    placeholder: 'Ej: Solo UE, Solo España...',
    wrapperClassName: 'sm:col-span-2',
  },
  {
    name: 'customTerms' as keyof AgreementTermsFormData,
    type: 'custom',
    wrapperClassName: 'sm:col-span-2',
    render: () => <AgreementCustomTermsField />,
  },
];
