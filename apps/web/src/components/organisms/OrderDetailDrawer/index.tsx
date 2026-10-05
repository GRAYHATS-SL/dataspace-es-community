'use client';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import Drawer from '@/components/molecules/Drawer';
import { cn } from '@/lib/utils';
import type { ProductOrder } from '@/types/api';

import CancelSection from './CancelSection';
import {
  ACTION_LABEL,
  CANCELLABLE_STATES,
  formatDate,
  getStateConfig,
  PRIORITY_LABEL,
  RECONCILABLE_STATES,
} from './constants';
import DetailRow from './DetailRow';
import VerifyPaymentSection from './VerifyPaymentSection';

/** Props of `OrderDetailDrawer`. */
export interface OrderDetailDrawerProps {
  order: ProductOrder | null;
  onClose: () => void;
}

/** OrderDetailDrawer - Product order detail with payment verification and cancellation. */
export default function OrderDetailDrawer({ order, onClose }: Readonly<OrderDetailDrawerProps>) {
  const stateConfig = getStateConfig(order?.state);
  const isCancellable = order?.state != null && CANCELLABLE_STATES.has(order.state);
  const isReconcilable =
    !!order?.externalId && order?.state != null && RECONCILABLE_STATES.has(order.state);
  const firstItem = order?.productOrderItem?.[0];

  return (
    <Drawer
      open={order !== null}
      onClose={onClose}
      title="Detalle de orden"
      description={firstItem?.productOffering?.name ?? firstItem?.productOffering?.id}
    >
      {order && (
        <div className="flex flex-col gap-6">
          {stateConfig && (
            <span
              className={cn(
                'inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium',
                stateConfig.className,
              )}
            >
              {stateConfig.label}
            </span>
          )}

          <div className="flex flex-col gap-1">
            <Typography variant="small" className="mb-1 font-semibold text-gray-700">
              Oferta
            </Typography>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <DetailRow label="Nombre" value={firstItem?.productOffering?.name} />
              <DetailRow
                label="ID"
                value={
                  <span className="break-all font-mono text-xs text-gray-500">
                    {firstItem?.productOffering?.id}
                  </span>
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Typography variant="small" className="mb-1 font-semibold text-gray-700">
              Detalles
            </Typography>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <DetailRow label="Fecha de orden" value={formatDate(order.orderDate)} />
              <DetailRow label="Inicio solicitado" value={formatDate(order.requestedStartDate)} />
              <DetailRow label="Fecha límite" value={formatDate(order.requestedCompletionDate)} />
              <DetailRow
                label="Prioridad"
                value={order.priority ? (PRIORITY_LABEL[order.priority] ?? order.priority) : null}
              />
              <DetailRow label="Descripción" value={order.description} />
            </div>
          </div>

          {order.productOrderItem.length > 0 && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Items
              </Typography>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                {order.productOrderItem.map((item, i) => (
                  <div key={item.id ?? i} className="flex flex-col gap-0">
                    <DetailRow
                      label="Acción"
                      value={ACTION_LABEL[item.action ?? ''] ?? item.action}
                    />
                    <DetailRow label="Cantidad" value={item.quantity} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="Hash" size={12} />
            <span className="break-all font-mono">{order.id}</span>
          </div>

          {isReconcilable && <VerifyPaymentSection order={order} />}
          {isCancellable && order.id && <CancelSection orderId={order.id} onSuccess={onClose} />}
        </div>
      )}
    </Drawer>
  );
}
