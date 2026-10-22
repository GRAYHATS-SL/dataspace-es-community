import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import SmartForm from '@/components/organisms/SmartForm';
import {
  type OrderDetailsFormData,
  orderDetailsSchema,
} from '@/lib/validations/productOrder.schema';

import { DETAILS_FIELDS } from './constants';

export interface DetailsStepProps {
  defaultValues: Partial<OrderDetailsFormData> | null;
  onBack: () => void;
  onNext: (data: OrderDetailsFormData) => void | Promise<void>;
}

/**
 * DetailsStep - Step 2 of `CheckoutDrawer`: quantity, priority and dates
 *
 * @param {Partial<OrderDetailsFormData>|null} defaultValues - Previous values, or `null`.
 * @param {() => void} onBack - Go back.
 * @param {(data: OrderDetailsFormData) => void|Promise<void>} onNext - Called with valid details.
 */
function DetailsStep({ defaultValues, onBack, onNext }: Readonly<DetailsStepProps>) {
  return (
    <SmartForm<OrderDetailsFormData>
      schema={orderDetailsSchema}
      fields={DETAILS_FIELDS}
      defaultValues={defaultValues ?? { quantity: 1 }}
      columns={2}
      resetOnSubmit={false}
      onSubmit={onNext}
      renderActions={({ isSubmitting }) => (
        <div className="mt-2 flex gap-3">
          <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Preparando...' : 'Continuar'}
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

export default DetailsStep;
