import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import {
  buildAgreementCharacteristics,
  buildTermOrConditions,
} from '@/lib/utils/buildAgreementPayload';
import type { AgreementTermsFormData } from '@/lib/validations/agreement.schema';
import type { ProductOrder } from '@/types/api';

import TermRow from './TermRow';

export interface ConfirmStepProps {
  order: ProductOrder;
  values: AgreementTermsFormData;
  onBack: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * ConfirmStep - Step 3 of `AgreementDrawer`: final summary
 *
 * @param {ProductOrder} order - Source order.
 * @param {AgreementTermsFormData} values - Configured terms.
 * @param {() => void} onBack - Go back.
 * @param {() => void} onConfirm - Create the agreement.
 * @param {boolean} isLoading - Creation in progress.
 * @param {string|null} error - Creation error, if any.
 */
function ConfirmStep({
  order,
  values,
  onBack,
  onConfirm,
  isLoading,
  error,
}: Readonly<ConfirmStepProps>) {
  const terms = buildTermOrConditions(values);
  const chars = buildAgreementCharacteristics(values);
  const geoRestriction = chars.find((c) => c.name === 'geographicRestrictions');
  const startDate = chars.find((c) => c.name === 'agreementStartDate');
  const endDate = chars.find((c) => c.name === 'agreementEndDate');

  const buyer = order.relatedParty?.find((p) => p.role?.toLowerCase() === 'buyer');
  const seller = order.relatedParty?.find((p) => p.role?.toLowerCase() === 'seller');
  const offeringName =
    order.productOrderItem?.[0]?.productOffering?.name ??
    order.productOrderItem?.[0]?.productOffering?.id ??
    '—';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Typography variant="small" className="mb-1 font-semibold text-gray-700">
          Oferta y partes
        </Typography>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
          <div className="flex justify-between border-b border-gray-100 py-1.5">
            <Typography variant="small" color="gray">
              Oferta
            </Typography>
            <Typography variant="small">{offeringName}</Typography>
          </div>
          {buyer && (
            <div className="flex justify-between border-b border-gray-100 py-1.5">
              <Typography variant="small" color="gray">
                Comprador
              </Typography>
              <Typography variant="small">{buyer.name ?? buyer.id}</Typography>
            </div>
          )}
          {seller && (
            <div className="flex justify-between py-1.5">
              <Typography variant="small" color="gray">
                Vendedor
              </Typography>
              <Typography variant="small">{seller.name ?? seller.id}</Typography>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Typography variant="small" className="mb-1 font-semibold text-gray-700">
          Condiciones acordadas
        </Typography>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          {terms.map((t) => (
            <TermRow key={t.id} description={t.description ?? ''} />
          ))}
          {geoRestriction && (
            <TermRow description={`Restricciones geográficas: ${geoRestriction.value}`} />
          )}
          {(startDate || endDate) && (
            <TermRow
              description={`Vigencia: ${startDate?.value ?? '—'} → ${endDate?.value ?? '—'}`}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-red-500" />
          <Typography variant="small" className="text-red-700">
            {error}
          </Typography>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="primary" disabled={isLoading} className="flex-1" onClick={onConfirm}>
          {isLoading ? 'Creando acuerdo...' : 'Crear acuerdo'}
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
