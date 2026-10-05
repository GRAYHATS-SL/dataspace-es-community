'use client';

import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import Drawer from '@/components/molecules/Drawer';
import { useCreateProduct } from '@/hooks/queries';
import { formatDate } from '@/lib/utils/formatDate';
import type { Agreement, NewProductInventory, ProductOrder } from '@/types/api';

import SummaryRow from './SummaryRow';

/** Props of `ProductActivationDrawer`. */
export interface ProductActivationDrawerProps {
  /** Agreement to activate; `null` keeps the drawer closed. */
  agreement: Agreement | null;
  /** Source order of the agreement, if any. */
  order: ProductOrder | null;
  onClose: () => void;
}

function truncateId(id?: string): string {
  if (!id) return '—';
  return id.length > 24 ? `…${id.slice(-20)}` : id;
}

/** Builds the TMF637 product created when an agreement is activated. */
function buildActivationPayload(
  agreement: Agreement,
  order: ProductOrder | null,
): NewProductInventory {
  const offering = agreement.agreementItem[0]?.productOffering?.[0];
  // Here you define your business logic (characteristics, prices, related parties, dates...).
  return {
    name: agreement.name,
    status: 'active',
    startDate: new Date().toISOString(),
    ...(offering && { productOffering: { id: offering.id, name: offering.name } }),
    ...(agreement.id && { agreement: [{ id: agreement.id, name: agreement.name }] }),
    ...(order?.id && { productOrderItem: [{ productOrderId: order.id, role: 'origin' }] }),
    relatedParty: agreement.engagedParty,
  };
}

/** ProductActivationDrawer - Confirmation drawer that creates an inventory product from an agreement. */
export default function ProductActivationDrawer({
  agreement,
  order,
  onClose,
}: Readonly<ProductActivationDrawerProps>) {
  const [error, setError] = useState<string | null>(null);
  const { mutate: createProduct, isPending } = useCreateProduct();

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleActivate = () => {
    if (!agreement) return;
    setError(null);
    createProduct(buildActivationPayload(agreement, order), {
      onSuccess: () => handleClose(),
      onError: (err) => setError(err instanceof Error ? err.message : 'Error al activar el acceso'),
    });
  };

  const offering = agreement?.agreementItem[0]?.productOffering?.[0];
  const buyer = agreement?.engagedParty.find((p) => p.role?.toLowerCase() === 'buyer');
  const seller = agreement?.engagedParty.find((p) => p.role?.toLowerCase() === 'seller');
  const startDateChar = agreement?.characteristic?.find((c) => c.name === 'agreementStartDate');
  const endDateChar = agreement?.characteristic?.find((c) => c.name === 'agreementEndDate');

  return (
    <Drawer
      open={agreement !== null}
      onClose={handleClose}
      title="Activar acceso al producto"
      description={agreement?.name}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <Typography variant="small" className="mb-1 font-semibold text-gray-700">
            Resumen del acceso
          </Typography>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <SummaryRow label="Oferta" value={offering?.name ?? offering?.id ?? '—'} />
            <SummaryRow label="Comprador" value={buyer?.name ?? buyer?.id ?? '—'} />
            <SummaryRow label="Vendedor" value={seller?.name ?? seller?.id ?? '—'} />
            <SummaryRow
              label="Acuerdo"
              value={
                <span className="font-mono text-xs text-gray-500">{truncateId(agreement?.id)}</span>
              }
            />
            <SummaryRow
              label="Orden origen"
              value={
                order ? (
                  <span className="font-mono text-xs text-gray-500">{truncateId(order.id)}</span>
                ) : (
                  '—'
                )
              }
            />
            <SummaryRow
              label="Inicio acceso"
              value={startDateChar?.value ? formatDate(startDateChar.value) : 'Hoy'}
            />
            <SummaryRow
              label="Fin acceso"
              value={endDateChar?.value ? formatDate(endDateChar.value) : 'Sin expiración'}
            />
          </div>
        </div>

        <div className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <Icon name="Info" size={16} className="mt-0.5 shrink-0 text-emerald-600" />
          <Typography variant="small" color="gray">
            Al activar el acceso se creará una entrada en el inventario de productos. El comprador
            podrá consultarla en su panel <strong>«Mi inventario»</strong>.
          </Typography>
        </div>

        {!order && (
          <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <Icon name="AlertTriangle" size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <Typography variant="small" color="gray">
              No se encontró la orden de origen. El producto se creará sin referencia a la orden.
            </Typography>
          </div>
        )}

        {error && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
            <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-red-500" />
            <Typography variant="small" className="text-red-700">
              {error}
            </Typography>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="primary" disabled={isPending} className="flex-1" onClick={handleActivate}>
            {isPending ? 'Activando...' : 'Activar acceso'}
          </Button>
          <Button variant="outline" disabled={isPending} onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
