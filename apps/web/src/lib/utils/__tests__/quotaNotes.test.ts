import { describe, expect, it } from 'vitest';

import type { QuotaMetric, QuotaStatus, QuotaView } from '@/lib/utils/quota';
import { getQuotaNote } from '@/lib/utils/quotaNotes';

const METRIC: QuotaMetric = {
  limited: true,
  cap: 10,
  consumed: 1,
  remaining: 9,
  exceeded: false,
  ok: true,
};
const view = (status: QuotaStatus): QuotaView => ({ status, bytes: METRIC, requests: METRIC });

describe('getQuotaNote', () => {
  it('sin cancelación: active no tiene nota', () => {
    expect(getQuotaNote(view('active'), false)).toBeNull();
  });

  it.each(['unlimited', 'exhausted', 'not-activated'] as const)(
    'sin cancelación: %s tiene nota',
    (status) => {
      expect(getQuotaNote(view(status), false)).toEqual(expect.any(String));
    },
  );

  it('cancelado y sin compra aplicada', () => {
    expect(getQuotaNote(view('not-activated'), true)).toMatch(/sin compra aplicada/);
  });

  it('cancelado y agotada', () => {
    expect(getQuotaNote(view('exhausted'), true)).toMatch(/Cuota agotada y pedido cancelado/);
  });

  it.each(['active', 'unlimited'] as const)('cancelado con estado %s', (status) => {
    expect(getQuotaNote(view(status), true)).toMatch(/no tienes acceso/);
  });
});
