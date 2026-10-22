import { describe, expect, it } from 'vitest';

import { buildPolicyChar } from '@/lib/utils/productSpecPolicy';
import {
  formatBytes,
  getQuotaOfferTerms,
  interpretQuota,
  isValidConsumerDid,
  parseQuotaResponse,
  readContractAddress,
  readOrganizationDid,
  resolveProviderEndpoints,
} from '@/lib/utils/quota';
import type { ProductSpecification } from '@/types/api';

const DID = 'did:web:provider02.dataspace.es';
const ADDRESS = 'https://contract.provider02.dataspace.es';

const response = (over: Record<string, unknown> = {}) => ({
  allowed: true,
  bytes_cap: 0,
  bytes_consumed: 0,
  bytes_ok: true,
  bytes_remaining: null,
  requests_cap: 0,
  requests_consumed: 0,
  requests_ok: true,
  requests_remaining: null,
  ...over,
});

const specWith = (data: Parameters<typeof buildPolicyChar>[0]): ProductSpecification => ({
  productSpecCharacteristic: [buildPolicyChar(data, DID, 'https://x/policy/offer/a')],
});

describe('parseQuotaResponse', () => {
  it('normaliza una respuesta válida', () => {
    expect(parseQuotaResponse(response({ bytes_cap: 51200, requests_cap: 20 }))).toMatchObject({
      allowed: true,
      bytesCap: 51200,
      requestsCap: 20,
    });
  });

  it.each([null, [], 'x', response({ allowed: 'yes' }), response({ bytes_cap: -1 })])(
    'rechaza %j',
    (body) => {
      expect(() => parseQuotaResponse(body)).toThrow('Respuesta de /quota no válida');
    },
  );

  it('rechaza si falta un campo', () => {
    expect(() => parseQuotaResponse(response({ requests_ok: undefined }))).toThrow('requests_ok');
  });
});

describe('readContractAddress / readOrganizationDid', () => {
  it('lee la dirección de un objeto, con scope suelto o en lista', () => {
    expect(readContractAddress({ address: ADDRESS, scope: 'default' })).toBe(ADDRESS);
    expect(readContractAddress({ address: ADDRESS, scope: ['default'] })).toBe(ADDRESS);
  });

  it('lee la dirección de un JSON serializado', () => {
    expect(readContractAddress(JSON.stringify({ address: ADDRESS }))).toBe(ADDRESS);
  });

  it.each([undefined, 'no-json', 5, {}, { address: 3 }])('devuelve undefined con %j', (v) => {
    expect(readContractAddress(v as never)).toBeUndefined();
  });

  it('el DID solo se acepta como texto no vacío', () => {
    expect(readOrganizationDid(DID)).toBe(DID);
    expect(readOrganizationDid('')).toBeUndefined();
    expect(readOrganizationDid({} as never)).toBeUndefined();
  });
});

describe('isValidConsumerDid', () => {
  it('acepta did:web con host y rechaza el resto', () => {
    expect(isValidConsumerDid('did:web:consumer02.dataspace.es')).toBe(true);
    expect(isValidConsumerDid('did:key:abc')).toBe(false);
    expect(isValidConsumerDid('did:web:host/../x')).toBe(false);
    expect(isValidConsumerDid('did:web:host?x=1')).toBe(false);
  });
});

describe('resolveProviderEndpoints', () => {
  it('deriva contract y verifier', () => {
    expect(resolveProviderEndpoints(`${ADDRESS}/`, DID)).toEqual({
      contractBase: ADDRESS,
      verifierBase: 'https://verifier.provider02.dataspace.es',
    });
  });

  it.each([
    // eslint-disable-next-line sonarjs/no-clear-text-protocols
    ['http', 'http://contract.provider02.dataspace.es'],
    ['credenciales', 'https://u:p@contract.provider02.dataspace.es'],
    ['puerto', 'https://contract.provider02.dataspace.es:8443'],
    ['ruta', 'https://contract.provider02.dataspace.es/api'],
    ['query', 'https://contract.provider02.dataspace.es/?a=1'],
    ['IP', 'https://52.49.65.98'],
    ['otro dominio', 'https://contract.provider02.evil.com'],
    ['host que no cuelga del DID', 'https://contract.provider03.dataspace.es'],
    ['sin prefijo contract', 'https://provider02.dataspace.es'],
    ['sufijo engañoso', 'https://contract.provider02.dataspace.es.evil.com'],
    ['no es URL', 'no-url'],
  ])('rechaza %s', (_name, address) => {
    expect(() => resolveProviderEndpoints(address, DID)).toThrow('contract management');
  });

  it('rechaza un DID que no es did:web de dataspace.es', () => {
    expect(() => resolveProviderEndpoints(ADDRESS, 'did:web:provider02.evil.com')).toThrow();
    expect(() => resolveProviderEndpoints(ADDRESS, 'did:key:abc')).toThrow();
  });
});

describe('getQuotaOfferTerms', () => {
  it('devuelve offerId y límites', () => {
    const spec = specWith({
      odrlPathRegex: '^/x$',
      odrlOfferId: 'provider02-httpbin-cuota',
      odrlBytesLimit: 51200,
      odrlRequestsLimit: 20,
    });
    expect(getQuotaOfferTerms(spec)).toEqual({
      offerId: 'provider02-httpbin-cuota',
      bytesLimit: 51200,
      requestsLimit: 20,
    });
  });

  it('undefined si la oferta es ilimitada o el offerId no es válido', () => {
    expect(getQuotaOfferTerms(specWith({ odrlPathRegex: '^/x$' }))).toBeUndefined();
    expect(
      getQuotaOfferTerms(specWith({ odrlPathRegex: '^/x$', odrlOfferId: '../x' })),
    ).toBeUndefined();
    expect(getQuotaOfferTerms(undefined)).toBeUndefined();
  });
});

describe('interpretQuota', () => {
  const both = { offerId: 'o', bytesLimit: 51200, requestsLimit: 20 };

  it('active con consumo parcial', () => {
    const view = interpretQuota(
      parseQuotaResponse(
        response({
          bytes_cap: 51200,
          bytes_consumed: 2237,
          requests_cap: 20,
          requests_consumed: 1,
        }),
      ),
      both,
    );
    expect(view.status).toBe('active');
    expect(view.bytes).toMatchObject({ limited: true, remaining: 48963, exceeded: false });
  });

  it('exhausted cuando allowed es false y permite pasarse del cap en bytes', () => {
    const view = interpretQuota(
      parseQuotaResponse(
        response({
          allowed: false,
          bytes_cap: 51200,
          bytes_consumed: 52000,
          bytes_ok: false,
          requests_cap: 20,
        }),
      ),
      both,
    );
    expect(view.status).toBe('exhausted');
    expect(view.bytes).toMatchObject({ remaining: 0, exceeded: true, ok: false });
  });

  it('not-activated: política con límites y caps a 0', () => {
    expect(interpretQuota(parseQuotaResponse(response()), both).status).toBe('not-activated');
  });

  it('solo bytes: requests_cap 0 es sin límite, no «no comprado»', () => {
    const view = interpretQuota(parseQuotaResponse(response({ bytes_cap: 100 })), {
      offerId: 'o',
      bytesLimit: 100,
    });
    expect(view.status).toBe('active');
    expect(view.requests.limited).toBe(false);
  });

  it('unlimited: sin límites en la política', () => {
    expect(interpretQuota(parseQuotaResponse(response()), { offerId: 'o' }).status).toBe(
      'unlimited',
    );
  });
});

describe('formatBytes', () => {
  it.each([
    [512, '512 B'],
    [51200, '50 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [1572864, '1.5 MB'],
  ])('%d → %s', (n, text) => {
    expect(formatBytes(n)).toBe(text);
  });
});
