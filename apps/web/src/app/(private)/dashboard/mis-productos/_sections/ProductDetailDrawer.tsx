'use client';

import { useRouter } from 'next/navigation';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/formatDate';
import type { ProductInventory } from '@/types/api';

import { DEFAULT_PILL_CONFIG, STATUS_PILL_CONFIG } from './constants';

/** Props of `ProductDetailDrawer`. */
export interface ProductDetailDrawerProps {
  product: ProductInventory | null;
  onClose: () => void;
}

/** Side panel with the detail of a product (parties, validity, linked offering, agreement, order). */
export default function ProductDetailDrawer({
  product,
  onClose,
}: Readonly<ProductDetailDrawerProps>) {
  const router = useRouter();
  if (!product) return null;

  const statusConfig =
    (product.status ? STATUS_PILL_CONFIG[product.status] : undefined) ?? DEFAULT_PILL_CONFIG;
  const agreementId = product.agreement?.[0]?.id;
  const orderId = product.productOrderItem?.[0]?.productOrderId;
  const seller = product.relatedParty?.find((p) => p.role?.toLowerCase() === 'seller');
  const buyer = product.relatedParty?.find((p) => p.role?.toLowerCase() === 'buyer');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del producto"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <Typography as="h2" variant="subtitle">
              Detalle del producto
            </Typography>
            {product.name && (
              <Typography variant="small" color="gray">
                {product.name}
              </Typography>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-gray-400 hover:text-gray-700"
          >
            <Icon name="X" size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <span
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
              statusConfig.bgColor,
              statusConfig.textColor,
            )}
          >
            <span className={cn('size-2 rounded-full', statusConfig.dotColor)} />
            {statusConfig.label}
          </span>

          <div className="flex flex-col gap-1">
            <Typography variant="small" className="mb-1 font-semibold text-gray-700">
              Partes
            </Typography>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
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
                    Proveedor
                  </Typography>
                  <Typography variant="small">{seller.name ?? seller.id}</Typography>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Typography variant="small" className="mb-1 font-semibold text-gray-700">
              Vigencia
            </Typography>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <Typography variant="small" color="gray">
                  Inicio
                </Typography>
                <Typography variant="small">{formatDate(product.startDate)}</Typography>
              </div>
              <div className="flex justify-between py-1.5">
                <Typography variant="small" color="gray">
                  Expiración
                </Typography>
                <Typography variant="small">
                  {product.terminationDate ? formatDate(product.terminationDate) : 'Sin expiración'}
                </Typography>
              </div>
            </div>
          </div>

          {product.productOffering && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Oferta vinculada
              </Typography>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Typography variant="small" className="break-all font-mono text-xs text-gray-500">
                  {product.productOffering.name ?? product.productOffering.id}
                </Typography>
              </div>
            </div>
          )}

          {agreementId && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Términos del acuerdo
              </Typography>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Typography variant="small" className="break-all font-mono text-xs text-gray-500">
                  {agreementId}
                </Typography>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    router.push(`/dashboard/acuerdos?id=${encodeURIComponent(agreementId)}`);
                  }}
                >
                  Ver
                </Button>
              </div>
            </div>
          )}

          {orderId && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Orden de origen
              </Typography>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Typography variant="small" className="break-all font-mono text-xs text-gray-500">
                  {orderId}
                </Typography>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    router.push(`/dashboard/ordenes-producto?id=${encodeURIComponent(orderId)}`);
                  }}
                >
                  Ver
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="Hash" size={12} aria-hidden="true" />
            <span className="break-all font-mono">{product.id}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
