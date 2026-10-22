import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import QuotaStatusBadge from '@/components/atoms/QuotaStatusBadge';

afterEach(cleanup);

describe('QuotaStatusBadge', () => {
  it.each([
    ['active', 'Activa'],
    ['unlimited', 'Sin límite'],
    ['exhausted', 'Agotada'],
    ['not-activated', 'Sin activar'],
  ] as const)('muestra la etiqueta de %s', (status, label) => {
    render(<QuotaStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('cancelledOnly prevalece sobre el estado', () => {
    render(<QuotaStatusBadge status="exhausted" cancelledOnly />);
    expect(screen.getByText('Pedido cancelado')).toBeTruthy();
    expect(screen.queryByText('Agotada')).toBeNull();
  });
});
