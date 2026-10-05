import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { ProductOffering } from '@/types/api';

/** Props of `SummaryStep`. */
export interface SummaryStepProps {
  offering: ProductOffering;
  onNext: () => void;
  onCancel: () => void;
}

/** SummaryStep - Step 1 of the checkout: summary of the offering to acquire. */
function SummaryStep({ offering, onNext, onCancel }: Readonly<SummaryStepProps>) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-5">
        <div className="flex items-start justify-between gap-3">
          <Typography as="h3" variant="subtitle">
            {offering.name ?? 'Oferta sin nombre'}
          </Typography>
          {offering.lifecycleStatus && (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {offering.lifecycleStatus}
            </span>
          )}
        </div>

        {offering.description && (
          <Typography variant="body" color="gray" className="line-clamp-4">
            {offering.description}
          </Typography>
        )}

        <div className="flex flex-col gap-1 border-t border-gray-200 pt-2 text-xs text-gray-500">
          {offering.version && (
            <span className="flex items-center gap-1.5">
              <Icon name="Tag" size={12} />
              Versión {offering.version}
            </span>
          )}
          <span className="flex items-center gap-1.5 font-mono break-all">
            <Icon name="Hash" size={12} />
            {offering.id}
          </span>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <Icon name="Info" size={16} className="mt-0.5 shrink-0 text-neutral-500" />
        <Typography variant="small" color="gray">
          Al confirmar se creará una orden de producto con estado <strong>Recibida</strong>. El
          proveedor procesará tu solicitud y actualizará el estado.
        </Typography>
      </div>

      <div className="flex gap-3">
        <Button variant="primary" className="flex-1" onClick={onNext}>
          Continuar
          <Icon name="ChevronRight" size={14} className="ml-1" />
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export default SummaryStep;
