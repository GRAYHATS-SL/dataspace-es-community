import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { ProductOrder } from '@/types/api';

import { findParty, getOfferingName } from './constants';
import PartyRow from './PartyRow';

/** Props of `PartiesStep`. */
export interface PartiesStepProps {
  order: ProductOrder;
  onNext: () => void;
  onCancel: () => void;
}

/** PartiesStep - Step 1 of the agreement wizard: offering and parties of the order. */
function PartiesStep({ order, onNext, onCancel }: Readonly<PartiesStepProps>) {
  const buyer = findParty(order, 'buyer');
  const seller = findParty(order, 'seller');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-5">
        <Typography variant="small" className="font-semibold text-gray-700">
          Oferta vinculada
        </Typography>
        <Typography variant="body">{getOfferingName(order)}</Typography>
      </div>

      <div className="flex flex-col gap-1">
        <Typography variant="small" className="mb-1 font-semibold text-gray-700">
          Partes del acuerdo
        </Typography>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          {buyer && <PartyRow party={buyer} roleLabel="Comprador" />}
          {seller && <PartyRow party={seller} roleLabel="Vendedor" />}
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <Icon name="Info" size={16} className="mt-0.5 shrink-0 text-neutral-500" />
        <Typography variant="small" color="gray">
          En el siguiente paso configurarás las condiciones de uso. Las partes se establecen
          automáticamente a partir de la orden completada.
        </Typography>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" className="flex-1" onClick={onNext}>
          Configurar términos
          <Icon name="ChevronRight" size={14} className="ml-1" />
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default PartiesStep;
