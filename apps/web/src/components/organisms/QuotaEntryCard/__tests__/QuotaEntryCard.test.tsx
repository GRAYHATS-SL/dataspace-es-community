import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import QuotaEntryCard from '@/components/organisms/QuotaEntryCard';
import type { QuotaMetric, QuotaView } from '@/lib/utils/quota';

const limited: QuotaMetric = {
  limited: true,
  cap: 10,
  consumed: 4,
  remaining: 6,
  exceeded: false,
  ok: true,
};
const unlimited: QuotaMetric = { ...limited, limited: false, cap: 0 };

const VIEW: QuotaView = { status: 'active', bytes: limited, requests: limited };

afterEach(cleanup);

describe('QuotaEntryCard', () => {
  it('renderiza título, contraparte, detalle, estado y métricas', () => {
    render(
      <QuotaEntryCard title="Oferta A" party="Proveedor X" detail="1 completado(s)" view={VIEW} />,
    );
    expect(screen.getByRole('heading', { name: 'Oferta A' })).toBeTruthy();
    expect(screen.getByText('Proveedor X')).toBeTruthy();
    expect(screen.getByText('1 completado(s)')).toBeTruthy();
    expect(screen.getByText('Activa')).toBeTruthy();
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('muestra la nota del estado', () => {
    render(
      <QuotaEntryCard
        title="O"
        party="P"
        view={{ status: 'unlimited', bytes: unlimited, requests: unlimited }}
      />,
    );
    expect(screen.getByRole('status').textContent).toMatch(/no tiene límites/);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('cancelledOnly: badge y nota de pedido cancelado', () => {
    render(<QuotaEntryCard title="O" party="P" view={VIEW} cancelledOnly />);
    expect(screen.getByText('Pedido cancelado')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Pedido cancelado/);
  });

  it('error parcial: alerta y sin métricas', () => {
    render(<QuotaEntryCard title="O" party="P" error="HTTP 500" />);
    expect(screen.getByRole('alert').textContent).toBe('HTTP 500');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('sin detalle no lo renderiza', () => {
    render(<QuotaEntryCard title="O" party="P" view={VIEW} />);
    expect(screen.queryByText(/completado/)).toBeNull();
  });
});
