'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import CheckoutDrawer from '@/components/organisms/CheckoutDrawer';
import { useProductOfferingPrices } from '@/hooks/queries';
import { buildPriceValue, formatDateEs, getOfferingPrices } from '@/lib/utils/offeringMetadata';
import type { ProductOffering } from '@/types/api';

/** Props of `OfferingBuyBox`. */
export interface OfferingBuyBoxProps {
  offering: ProductOffering;
  publisher: string | undefined;
  isOwnOffering: boolean;
}

/** OfferingBuyBox - Price, acquire action (opens `CheckoutDrawer`) and offering metadata. */
const OfferingBuyBox = ({ offering, publisher, isOwnOffering }: Readonly<OfferingBuyBoxProps>) => {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { data: allPrices = [], isLoading: pricesLoading } = useProductOfferingPrices();

  const priceValue = buildPriceValue(getOfferingPrices(offering, allPrices));
  const updatedDate = offering.lastUpdate
    ? formatDateEs(offering.lastUpdate, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  // Here you define the price variation indicator (symbol + text, not only color) for dynamic pricing.
  const priceVariation = null as { symbol: string; label: string; className: string } | null;
  // Here you define when the offering can no longer be acquired (e.g. exhausted issuance).
  const isExhausted = false;

  let actionSlot: ReactNode;
  if (isOwnOffering) {
    actionSlot = (
      <Badge variant="filled" className="w-fit">
        Tu oferta
      </Badge>
    );
  } else if (isExhausted) {
    actionSlot = (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
        <Icon name="XCircle" size={16} className="shrink-0" />
        <span>No disponible</span>
      </div>
    );
  } else {
    actionSlot = (
      <Button variant="primary" className="w-full" onClick={() => setCheckoutOpen(true)}>
        Adquirir
      </Button>
    );
  }

  return (
    <>
      <Card variant="outlined" radius="xl" className="lg:sticky lg:top-6">
        <div className="flex flex-col gap-4">
          <div>
            <Typography variant="metadata-label" color="gray-light">
              Precio
            </Typography>
            <Typography variant="title" color="primary">
              {pricesLoading ? '…' : (priceValue ?? 'A consultar')}
            </Typography>
            {priceVariation && (
              <p
                className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${priceVariation.className}`}
              >
                <span aria-hidden="true">{priceVariation.symbol}</span>
                <span>{priceVariation.label}</span>
              </p>
            )}
          </div>

          {actionSlot}

          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
            {publisher && (
              <div className="flex items-center justify-between gap-3">
                <span>Proveedor</span>
                <span className="font-medium text-primary">{publisher}</span>
              </div>
            )}
            {updatedDate && (
              <div className="flex items-center justify-between gap-3">
                <span>Actualizado</span>
                <span className="font-medium text-primary">{updatedDate}</span>
              </div>
            )}
            {offering.version && (
              <div className="flex items-center justify-between gap-3">
                <span>Versión</span>
                <span className="font-medium text-primary">{offering.version}</span>
              </div>
            )}
            {offering.id && (
              <div className="flex items-center justify-between gap-3">
                <span>ID</span>
                <span className="truncate font-mono text-[11px] text-gray-400" title={offering.id}>
                  {offering.id}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {!isOwnOffering && (
        <CheckoutDrawer
          offering={checkoutOpen ? offering : null}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </>
  );
};

export default OfferingBuyBox;
