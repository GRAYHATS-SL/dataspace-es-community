'use client';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import AgreementCustomTermsField from '@/components/molecules/AgreementCustomTermsField';
import SmartForm, { type SmartFormField } from '@/components/organisms/SmartForm';
import {
  type AgreementTermsFormData,
  agreementTermsSchema,
  DEFAULT_AGREEMENT_TERMS,
  PURPOSE_OPTIONS,
} from '@/lib/validations/agreement.schema';

/** Props of `TermsStep`. */
export interface TermsStepProps {
  defaultValues: Partial<AgreementTermsFormData> | null;
  onBack: () => void;
  onNext: (data: AgreementTermsFormData) => void;
}

const PURPOSE_SELECT_OPTIONS = PURPOSE_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

/** Fields of the agreement terms form. */
const TERMS_FIELDS: SmartFormField<AgreementTermsFormData>[] = [
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
    placeholder: 'Ej: solo UE, solo un país...',
    wrapperClassName: 'sm:col-span-2',
  },
  {
    name: 'customTerms' as keyof AgreementTermsFormData,
    type: 'custom',
    wrapperClassName: 'sm:col-span-2',
    render: () => <AgreementCustomTermsField />,
  },
];

/** TermsStep - Step 2 of the agreement wizard: usage conditions. */
function TermsStep({ defaultValues, onBack, onNext }: Readonly<TermsStepProps>) {
  return (
    <SmartForm<AgreementTermsFormData>
      schema={agreementTermsSchema}
      fields={TERMS_FIELDS}
      defaultValues={defaultValues ?? DEFAULT_AGREEMENT_TERMS}
      columns={2}
      resetOnSubmit={false}
      onSubmit={onNext}
      renderActions={({ isSubmitting }) => (
        <div className="mt-2 flex gap-3">
          <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
            Revisar acuerdo
            <Icon name="ChevronRight" size={14} className="ml-1" />
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            <Icon name="ChevronLeft" size={14} className="mr-1" />
            Volver
          </Button>
        </div>
      )}
    />
  );
}

export default TermsStep;
