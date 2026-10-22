import crypto from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { verifyInternalToken } from '@infrastructure/internalToken.js';

const SECRET = 'a-very-long-shared-secret-used-only-in-tests';
const OFFERING_ID = 'urn:ngsi-ld:product-offering:1';

const signToken = (payload: Record<string, unknown>, secret = SECRET): string => {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
};

const validPayload = (overrides?: Record<string, unknown>) => ({
  offeringId: OFFERING_ID,
  organizationId: 'urn:ngsi-ld:organization:1',
  individualId: 'urn:ngsi-ld:individual:1',
  iat: Date.now(),
  ...overrides,
});

describe('verifyInternalToken', () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.TOKEN_SECRET;
  });

  it('acepta un token válido y devuelve el payload', () => {
    const token = signToken(validPayload());

    const result = verifyInternalToken(token, OFFERING_ID);

    expect(result).toEqual({
      ok: true,
      value: {
        offeringId: OFFERING_ID,
        organizationId: 'urn:ngsi-ld:organization:1',
        individualId: 'urn:ngsi-ld:individual:1',
      },
    });
  });

  it('rechaza un token expirado (TTL 60s superado)', () => {
    const token = signToken(validPayload({ iat: Date.now() - 61_000 }));

    const result = verifyInternalToken(token, OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rechaza un token con iat en el futuro', () => {
    const token = signToken(validPayload({ iat: Date.now() + 5_000 }));

    const result = verifyInternalToken(token, OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rechaza un token con firma incorrecta', () => {
    const token = signToken(validPayload(), 'otro-secreto-completamente-distinto');

    const result = verifyInternalToken(token, OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rechaza cuando offeringId del payload no coincide con el del path', () => {
    const token = signToken(validPayload());

    const result = verifyInternalToken(token, 'urn:ngsi-ld:product-offering:otro');

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rechaza un token malformado', () => {
    const result = verifyInternalToken('token-sin-formato-valido', OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });

  it('rechaza si no hay TOKEN_SECRET configurado', () => {
    delete process.env.TOKEN_SECRET;
    const token = signToken(validPayload());

    const result = verifyInternalToken(token, OFFERING_ID);

    expect(result).toEqual({ ok: false, error: 'invalid' });
  });
});
