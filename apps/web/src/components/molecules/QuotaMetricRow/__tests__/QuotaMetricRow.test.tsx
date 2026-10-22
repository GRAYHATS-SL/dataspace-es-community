import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import QuotaMetricRow from '@/components/molecules/QuotaMetricRow';
import type { QuotaMetric } from '@/lib/utils/quota';

const base: QuotaMetric = {
  limited: true,
  cap: 100,
  consumed: 40,
  remaining: 60,
  exceeded: false,
  ok: true,
};

afterEach(cleanup);

describe('QuotaMetricRow', () => {
  it('métrica sin límite: texto sin barra', () => {
    render(
      <QuotaMetricRow
        label="Peticiones"
        metric={{ ...base, limited: false, cap: 0 }}
        format={String}
      />,
    );
    expect(screen.getByText('Peticiones: sin límite (consumido 40)')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('métrica limitada: barra con porcentaje y texto formateado', () => {
    render(<QuotaMetricRow label="Bytes" metric={base} format={(n) => `${n} B`} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('40 B de 100 B')).toBeTruthy();
  });

  it('muestra aviso si superó el límite', () => {
    render(
      <QuotaMetricRow
        label="Bytes"
        metric={{ ...base, consumed: 120, exceeded: true, ok: false }}
        format={String}
      />,
    );
    expect(screen.getByText(/superó el límite/)).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });
});
