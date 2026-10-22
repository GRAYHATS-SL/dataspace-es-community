import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import SmartForm from '@/components/organisms/SmartForm';
import {
  type AgreementTermsFormData,
  agreementTermsSchema,
  DEFAULT_AGREEMENT_TERMS,
} from '@/lib/validations/agreement.schema';

import { TERMS_FIELDS } from './constants';

export interface TermsStepProps {
  defaultValues: Partial<AgreementTermsFormData> | null;
  onBack: () => void;
  onNext: (data: AgreementTermsFormData) => void;
}

/**
 * TermsStep - Step 2 of `AgreementDrawer`: usage terms
 *
 * @param {Partial<AgreementTermsFormData>|null} defaultValues - Previous values, or `null`.
 * @param {() => void} onBack - Go back.
 * @param {(data: AgreementTermsFormData) => void} onNext - Called with valid terms.
 */
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
