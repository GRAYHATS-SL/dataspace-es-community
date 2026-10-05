'use client';

import Meter from '@/components/atoms/Meter';
import Typography from '@/components/atoms/Typography';
import { useUsagesByProduct } from '@/hooks/queries';
import type { ProductInventory } from '@/types/api';

import { deriveTokenConsumption, extractTokenLimits } from './helpers';

/** Consumption bars (requests / transfer) of a product with access limits. */
export default function TokenConsumptionCell({ product }: Readonly<{ product: ProductInventory }>) {
  const limits = extractTokenLimits(product);
  const usagesQuery = useUsagesByProduct(product.id ?? '', { enabled: !!limits && !!product.id });

  if (!limits) {
    return (
      <Typography variant="small" color="gray">
        —
      </Typography>
    );
  }

  if (usagesQuery.isError) {
    return (
      <div className="flex flex-col gap-0.5 text-left">
        <Typography variant="small" color="gray">
          Límite: {limits.maxRequests.toLocaleString('es-ES')} peticiones /{' '}
          {limits.maxTransferTB.toLocaleString('es-ES')} TB
        </Typography>
        <Typography variant="small" color="gray" className="italic">
          Consumo no disponible
        </Typography>
      </div>
    );
  }

  const consumption = deriveTokenConsumption(usagesQuery.data ?? []);

  return (
    <div className="flex w-40 flex-col gap-2">
      <Meter used={consumption.usedRequests} total={limits.maxRequests} label="Peticiones" />
      <Meter
        used={consumption.usedTransferTB}
        total={limits.maxTransferTB}
        label="Transferencia"
        unit="TB"
      />
    </div>
  );
}
