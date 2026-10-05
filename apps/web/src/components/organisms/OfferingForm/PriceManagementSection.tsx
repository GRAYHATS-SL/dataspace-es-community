'use client';

import { useState } from 'react';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import PriceForm from '@/components/organisms/PriceForm';
import {
  usePatchProductOffering,
  useProductOffering,
  useProductOfferingPrices,
} from '@/hooks/queries';
import { PRICE_TYPE_OPTIONS } from '@/lib/constants/productSpec';
import type { ProductOfferingPrice, ProductOfferingPriceRef } from '@/types/api';

/** Props of `PriceManagementSection`. */
export interface PriceManagementSectionProps {
  offeringId: string;
}

const priceTypeLabel = (type?: string): string =>
  PRICE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type ?? '';

const describePrice = (p: ProductOfferingPrice): string =>
  [priceTypeLabel(p.priceType), p.price ? `${p.price.value ?? ''} ${p.price.unit ?? ''}` : '']
    .filter((s) => s.trim())
    .join(' · ');

/** Builds the price references to store in the offering. */
function buildPriceRefs(prices: ProductOfferingPrice[]): ProductOfferingPriceRef[] {
  // Here you define your business logic (reference shape expected by your API).
  return prices.flatMap((p) => (p.id ? [{ id: p.id, href: p.href, name: p.name }] : []));
}

/** Links, unlinks and creates the prices of an existing offering. */
export default function PriceManagementSection({
  offeringId,
}: Readonly<PriceManagementSectionProps>) {
  const offeringQuery = useProductOffering(offeringId);
  const pricesQuery = useProductOfferingPrices();
  const patchMutation = usePatchProductOffering();
  const [selectedPriceId, setSelectedPriceId] = useState('');

  const allPrices = pricesQuery.data ?? [];
  const linkedIds = new Set((offeringQuery.data?.productOfferingPrice ?? []).map((r) => r.id));
  const linkedPrices = allPrices.filter((p) => p.id && linkedIds.has(p.id));
  const availablePrices = allPrices.filter((p) => p.id && !linkedIds.has(p.id));

  const savePrices = (prices: ProductOfferingPrice[], onSuccess?: () => void) => {
    patchMutation.mutate(
      { id: offeringId, payload: { productOfferingPrice: buildPriceRefs(prices) } },
      { onSuccess },
    );
  };

  if (offeringQuery.isLoading || pricesQuery.isLoading) {
    return (
      <Typography variant="small" color="gray" role="status">
        Cargando precios…
      </Typography>
    );
  }

  if (offeringQuery.isError || pricesQuery.isError) {
    return (
      <Typography variant="small" className="text-danger" role="alert">
        No se pudieron cargar los precios de la oferta.
      </Typography>
    );
  }

  return (
    <div className="border-t border-gray-lightest pt-5">
      <Typography as="h4" variant="small" className="mb-3 font-semibold text-primary">
        Precios vinculados
      </Typography>

      {linkedPrices.length === 0 ? (
        <Typography variant="small" color="gray" className="mb-4">
          Sin precios vinculados.
        </Typography>
      ) : (
        <ul className="mb-5 space-y-1.5">
          {linkedPrices.map((price) => (
            <li
              key={price.id}
              className="flex items-center justify-between rounded-lg border border-gray-lightest bg-white px-3 py-2 text-xs"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-primary">{price.name}</span>
                <span className="text-gray">{describePrice(price)}</span>
              </div>
              <button
                type="button"
                onClick={() => savePrices(linkedPrices.filter((p) => p.id !== price.id))}
                disabled={patchMutation.isPending}
                aria-label={`Desvincular ${price.name ?? 'precio'}`}
                className="flex min-h-11 min-w-11 items-center justify-center rounded text-danger hover:bg-danger/10 disabled:cursor-default disabled:opacity-40"
              >
                <Icon name="X" size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {availablePrices.length > 0 && (
        <div className="mb-5">
          <Typography as="h4" variant="small" className="mb-2 font-semibold text-primary">
            Vincular precio existente
          </Typography>
          <div className="flex gap-2">
            <select
              aria-label="Vincular precio existente"
              value={selectedPriceId}
              onChange={(e) => setSelectedPriceId(e.target.value)}
              className="flex-1 rounded-md border border-gray-lightest bg-white px-3 py-1.5 text-xs text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Selecciona un precio…</option>
              {availablePrices.map((p) => (
                <option key={p.id} value={p.id}>
                  {[p.name, describePrice(p)].filter(Boolean).join(' · ')}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const selected = availablePrices.find((p) => p.id === selectedPriceId);
                if (!selected) return;
                savePrices([...linkedPrices, selected], () => setSelectedPriceId(''));
              }}
              disabled={!selectedPriceId || patchMutation.isPending}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:cursor-default disabled:opacity-40"
            >
              {patchMutation.isPending ? 'Vinculando…' : 'Vincular'}
            </button>
          </div>
        </div>
      )}

      {patchMutation.isError && (
        <Typography variant="small" className="mb-4 text-danger" role="alert">
          No se pudieron actualizar los precios: {patchMutation.error.message}
        </Typography>
      )}

      <Typography as="h4" variant="small" className="mb-2 font-semibold text-primary">
        Crear y añadir precio
      </Typography>
      <PriceForm
        compact
        onClose={() => undefined}
        onSuccess={(price) => savePrices([...linkedPrices, price])}
      />
    </div>
  );
}
