import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { OrderDetailsFormData } from '@/lib/validations/productOrder.schema';
import type { ProductOffering } from '@/types/api';

import { formatDate, PRIORITY_LABEL } from './constants';
import SummaryRow from './SummaryRow';

/** Props of `ConfirmStep`. */
export interface ConfirmStepProps {
  offering: ProductOffering;
  values: OrderDetailsFormData;
  onBack: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

/** ConfirmStep - Final step for free offerings: summary before placing the order. */
function ConfirmStep({ offering, values, onBack, onConfirm, isLoading }: Readonly<ConfirmStepProps>) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Typography variant="small" className="mb-1 font-semibold text-gray-700">
          Oferta seleccionada
        </Typography>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <SummaryRow label="Nombre" value={offering.name} />
          <SummaryRow
            label="ID"
            value={<span className="font-mono text-xs break-all text-gray-500">{offering.id}</span>}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Typography variant="small" className="mb-1 font-semibold text-gray-700">
          Detalles del pedido
        </Typography>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <SummaryRow label="Cantidad" value={values.quantity} />
          {values.priority && (
            <SummaryRow label="Prioridad" value={PRIORITY_LABEL[values.priority] ?? values.priority} />
          )}
          {values.requestedStartDate && (
            <SummaryRow label="Inicio solicitado" value={formatDate(values.requestedStartDate)} />
          )}
          {values.requestedCompletionDate && (
            <SummaryRow label="Fecha límite" value={formatDate(values.requestedCompletionDate)} />
          )}
          {values.description && <SummaryRow label="Notas" value={values.description} />}
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <Icon name="Info" size={16} className="mt-0.5 shrink-0 text-neutral-500" />
        <Typography variant="small" color="gray">
          Esta oferta no tiene coste. Al confirmar, la orden se completará y tendrás acceso de
          inmediato.
        </Typography>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" disabled={isLoading} className="flex-1" onClick={onConfirm}>
          {isLoading ? 'Enviando...' : 'Confirmar y solicitar acceso'}
        </Button>
        <Button variant="outline" disabled={isLoading} onClick={onBack}>
          <Icon name="ChevronLeft" size={14} className="mr-1" />
          Revisar
        </Button>
      </div>
    </div>
  );
}

export default ConfirmStep;
