'use client';

import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Typography from '@/components/atoms/Typography';
import type { ProductInventory, ProductStatus } from '@/types/api';

/** Props of `SellerProductActions`. */
export interface SellerProductActionsProps {
  product: ProductInventory;
  onUpdate: (id: string, status: ProductStatus) => void;
  isLoading: boolean;
}

/** Suspend / reactivate / terminate actions of a product, as seen by its provider. */
export default function SellerProductActions({
  product,
  onUpdate,
  isLoading,
}: Readonly<SellerProductActionsProps>) {
  const [confirmTerminate, setConfirmTerminate] = useState(false);
  const { id, status } = product;

  if (!id) return null;

  if (confirmTerminate) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Typography variant="small" color="gray">
          ¿Terminar acceso?
        </Typography>
        <Button
          size="sm"
          variant="primary"
          disabled={isLoading}
          onClick={() => {
            onUpdate(id, 'terminated');
            setConfirmTerminate(false);
          }}
        >
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" disabled={isLoading} onClick={() => setConfirmTerminate(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {status === 'active' && (
        <Button size="sm" variant="outline" disabled={isLoading} onClick={() => onUpdate(id, 'suspended')}>
          Suspender
        </Button>
      )}
      {status === 'suspended' && (
        <Button size="sm" variant="outline" disabled={isLoading} onClick={() => onUpdate(id, 'active')}>
          Reactivar
        </Button>
      )}
      {(status === 'active' || status === 'suspended') && (
        <Button size="sm" variant="ghost" disabled={isLoading} onClick={() => setConfirmTerminate(true)}>
          Terminar
        </Button>
      )}
    </div>
  );
}
