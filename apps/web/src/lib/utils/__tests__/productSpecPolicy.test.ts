import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCredentialsChar,
  buildPolicyChar,
  extractPolicy,
  extractPolicyFormValues,
  extractPolicyUid,
  getDidWebHost,
  isValidRegex,
  mergeSpecCharacteristics,
  OFFER_ID_PATTERN,
  resolvePolicyUid,
  slugify,
} from '@/lib/utils/productSpecPolicy';
import type { ProductSpecification, ProductSpecificationCharacteristic } from '@/types/api';

const DID = 'did:web:provider02.dataspace.es';
const REGEX = '^/(bytes/[0-9]+|anything/.*)$';

const policyValue = (chars: ProductSpecificationCharacteristic) =>
  chars.productSpecCharacteristicValue?.[0]?.value as Record<string, unknown>;

afterEach(() => vi.restoreAllMocks());

describe('isValidRegex', () => {
  it('accepts compilable and rejects broken expressions', () => {
    expect(isValidRegex(REGEX)).toBe(true);
    expect(isValidRegex('^/(oops')).toBe(false);
  });
});

describe('OFFER_ID_PATTERN', () => {
  it.each(['a', 'provider02-httpbin-cuota', 'A1-b2', 'a'.repeat(64)])('accepts %s', (v) => {
    expect(OFFER_ID_PATTERN.test(v)).toBe(true);
  });
  it.each(['', '-a', 'a b', 'a_b', 'a/b', 'ñ', 'a'.repeat(65)])('rejects "%s"', (v) => {
    expect(OFFER_ID_PATTERN.test(v)).toBe(false);
  });
});

describe('getDidWebHost', () => {
  it('extracts the host from did:web:<host>', () => {
    expect(getDidWebHost(DID)).toBe('provider02.dataspace.es');
  });

  it('decodes %3A of the port (any case)', () => {
    expect(getDidWebHost('did:web:localhost%3A8443')).toBe('localhost:8443');
    expect(getDidWebHost('did:web:localhost%3a8443')).toBe('localhost:8443');
  });

  it('ignores path segments after the host', () => {
    expect(getDidWebHost('did:web:example.org:users:alice')).toBe('example.org');
  });

  it('throws a clear error for non did:web or empty DIDs', () => {
    expect(() => getDidWebHost('did:key:abc')).toThrow('did:web');
    expect(() => getDidWebHost('')).toThrow('did:web');
  });

  it('throws when the host is not valid', () => {
    expect(() => getDidWebHost('did:web:')).toThrow('host válido');
    expect(() => getDidWebHost('did:web:evil.com/x')).toThrow('host válido');
  });
});

describe('slugify', () => {
  it('lowercases, strips accents and collapses separators', () => {
    expect(slugify('Mi Especificación  de Datos!')).toBe('mi-especificacion-de-datos');
  });
  it('falls back to "spec" when empty', () => {
    expect(slugify(undefined)).toBe('spec');
    expect(slugify('¡¡¡')).toBe('spec');
  });
  it('caps the length at 40 without trailing dash', () => {
    const slug = slugify(`${'a'.repeat(39)} bbbb`);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('resolvePolicyUid', () => {
  it('uses the offerId when present (report example)', () => {
    expect(resolvePolicyUid({ host: 'provider02.dataspace.es', offerId: 'httpbin-cuota' })).toBe(
      'https://provider02.dataspace.es/policy/offer/httpbin-cuota',
    );
  });

  it('uses <slug>-<8 random chars> without offerId', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-aaaa-bbbb-cccc-dddddddddddd');
    expect(resolvePolicyUid({ host: 'h.es', name: 'Mi Spec' })).toBe(
      'https://h.es/policy/offer/mi-spec-12345678',
    );
  });

  it('reuses an existing v2 uid untouched', () => {
    expect(
      resolvePolicyUid({
        host: 'h.es',
        offerId: 'otro',
        existingUid: 'https://h.es/policy/offer/previo',
      }),
    ).toBe('https://h.es/policy/offer/previo');
  });

  it('does not reuse a v1 uid (urn:policy:…)', () => {
    expect(
      resolvePolicyUid({ host: 'h.es', offerId: 'x', existingUid: 'urn:policy:org:spec' }),
    ).toBe('https://h.es/policy/offer/x');
  });
});

describe('buildCredentialsChar', () => {
  it('is always the fixed ConsumerCredential object', () => {
    expect(buildCredentialsChar()).toEqual({
      id: 'credentialsConfig',
      name: 'Credentials Config',
      valueType: 'credentialsConfiguration',
      productSpecCharacteristicValue: [
        { isDefault: true, value: { credentialsType: 'ConsumerCredential', claims: [] } },
      ],
    });
  });
});

describe('buildPolicyChar', () => {
  const uid = 'https://provider02.dataspace.es/policy/offer/x';
  const permission = {
    'odrl:assigner': { '@id': DID },
    'odrl:target': {
      '@type': 'odrl:AssetCollection',
      'odrl:source': 'urn:asset',
      'odrl:refinement': {
        '@type': 'odrl:Constraint',
        'odrl:leftOperand': 'http:path',
        'odrl:operator': { '@id': 'odrl:regex' },
        'odrl:rightOperand': REGEX,
      },
    },
    'odrl:action': { '@id': 'odrl:use' },
  };

  it('builds the char envelope with an OBJECT value (not serialized JSON)', () => {
    const c = buildPolicyChar({ odrlPathRegex: REGEX }, DID, uid);
    expect(c.id).toBe('policyConfig');
    expect(c.name).toBe('Policy');
    expect(c.valueType).toBe('authorizationPolicy');
    expect(c.productSpecCharacteristicValue?.[0]?.isDefault).toBe(true);
    expect(typeof policyValue(c)).toBe('object');
  });

  it('unlimited: no offerId, no limits, no @context/@id/assignee', () => {
    const v = policyValue(buildPolicyChar({ odrlPathRegex: REGEX }, DID, uid));
    expect(v).toEqual({ '@type': 'odrl:Policy', 'odrl:uid': uid, 'odrl:permission': permission });
    expect(v).not.toHaveProperty('@context');
    expect(v).not.toHaveProperty('@id');
    expect(v).not.toHaveProperty('tmf:offerId');
  });

  it('bytes + requests', () => {
    const v = policyValue(
      buildPolicyChar(
        {
          odrlPathRegex: REGEX,
          odrlOfferId: 'cuota',
          odrlBytesLimit: 51200,
          odrlRequestsLimit: 20,
        },
        DID,
        uid,
      ),
    );
    expect(v).toEqual({
      '@type': 'odrl:Policy',
      'odrl:uid': uid,
      'tmf:offerId': 'cuota',
      'tmf:usageQuotaBytesLimit': 51200,
      'tmf:usageQuotaRequestsLimit': 20,
      'odrl:permission': permission,
    });
  });

  it('only bytes', () => {
    const v = policyValue(
      buildPolicyChar({ odrlPathRegex: REGEX, odrlOfferId: 'c', odrlBytesLimit: 10 }, DID, uid),
    );
    expect(v['tmf:usageQuotaBytesLimit']).toBe(10);
    expect(v).not.toHaveProperty('tmf:usageQuotaRequestsLimit');
  });

  it('only requests', () => {
    const v = policyValue(
      buildPolicyChar({ odrlPathRegex: REGEX, odrlOfferId: 'c', odrlRequestsLimit: 3 }, DID, uid),
    );
    expect(v['tmf:usageQuotaRequestsLimit']).toBe(3);
    expect(v).not.toHaveProperty('tmf:usageQuotaBytesLimit');
  });

  it('trims regex and ignores a blank offerId', () => {
    const v = policyValue(
      buildPolicyChar({ odrlPathRegex: `  ${REGEX} `, odrlOfferId: ' ' }, DID, uid),
    );
    expect(v).not.toHaveProperty('tmf:offerId');
    expect(JSON.stringify(v)).toBe(
      JSON.stringify(policyValue(buildPolicyChar({ odrlPathRegex: REGEX }, DID, uid))),
    );
  });
});

describe('extractPolicy / extractPolicyUid / extractPolicyFormValues', () => {
  const specWith = (value: unknown, id = 'policyConfig'): ProductSpecification => ({
    productSpecCharacteristic: [
      {
        id,
        valueType: 'authorizationPolicy',
        productSpecCharacteristicValue: [{ value: value as never }],
      },
    ],
  });

  it('round-trips a policy built by buildPolicyChar', () => {
    const chars = buildPolicyChar(
      { odrlPathRegex: REGEX, odrlOfferId: 'cuota', odrlBytesLimit: 100, odrlRequestsLimit: 2 },
      DID,
      'https://h.es/policy/offer/cuota',
    );
    const spec: ProductSpecification = { productSpecCharacteristic: [chars] };
    expect(extractPolicyUid(spec)).toBe('https://h.es/policy/offer/cuota');
    expect(extractPolicyFormValues(spec)).toEqual({
      odrlPathRegex: REGEX,
      odrlOfferId: 'cuota',
      odrlBytesLimit: 100,
      odrlRequestsLimit: 2,
    });
  });

  it('returns empty values when there is no policy', () => {
    expect(extractPolicy(undefined)).toBeUndefined();
    expect(extractPolicyUid({})).toBeUndefined();
    expect(extractPolicyFormValues({})).toEqual({ odrlPathRegex: '' });
  });

  it('tolerates the old JSON-text format (v1) without crashing', () => {
    const v1 = JSON.stringify({
      '@id': 'urn:policy:o:s',
      'odrl:uid': 'urn:policy:o:s',
      'odrl:permission': {
        'odrl:target': {
          'odrl:refinement': [
            { 'odrl:leftOperand': 'ngsi-ld:entityType', 'odrl:rightOperand': 'X' },
          ],
        },
      },
    });
    const spec = specWith(v1);
    expect(extractPolicyUid(spec)).toBe('urn:policy:o:s');
    expect(extractPolicyFormValues(spec)).toMatchObject({ odrlPathRegex: '' });
  });

  it('returns undefined for unparseable text, JSON arrays and non-object values', () => {
    expect(extractPolicy(specWith('{not json'))).toBeUndefined();
    expect(extractPolicy(specWith('[1,2]'))).toBeUndefined();
    expect(extractPolicy(specWith(42))).toBeUndefined();
  });

  it('finds the policy by valueType even when the id differs', () => {
    expect(extractPolicyUid(specWith({ 'odrl:uid': 'https://h/p' }, 'otro'))).toBe('https://h/p');
  });

  it('reads the http:path constraint from an array refinement and a permission array', () => {
    const spec = specWith({
      'odrl:permission': [
        {
          'odrl:target': {
            'odrl:refinement': [
              { 'odrl:leftOperand': 'x', 'odrl:rightOperand': 'no' },
              { 'odrl:leftOperand': 'http:path', 'odrl:rightOperand': '^/a$' },
            ],
          },
        },
      ],
    });
    expect(extractPolicyFormValues(spec).odrlPathRegex).toBe('^/a$');
  });

  it('ignores invalid limits and a non-string offerId', () => {
    const spec = specWith({
      'tmf:offerId': 5,
      'tmf:usageQuotaBytesLimit': -1,
      'tmf:usageQuotaRequestsLimit': '7',
    });
    expect(extractPolicyFormValues(spec)).toEqual({
      odrlPathRegex: '',
      odrlOfferId: '',
      odrlBytesLimit: undefined,
      odrlRequestsLimit: 7,
    });
  });

  it('ignores an empty or non-string odrl:uid', () => {
    expect(extractPolicyUid(specWith({ 'odrl:uid': '' }))).toBeUndefined();
    expect(extractPolicyUid(specWith({ 'odrl:uid': 3 }))).toBeUndefined();
  });
});

describe('mergeSpecCharacteristics', () => {
  const keep: ProductSpecificationCharacteristic = { id: 'datasetMetadata', name: 'meta' };
  const noId: ProductSpecificationCharacteristic = { name: 'sin id' };

  it('keeps unrelated characteristics and appends the new ones', () => {
    const merged = mergeSpecCharacteristics([keep, noId], [buildCredentialsChar()]);
    expect(merged.map((c) => c.id ?? c.name)).toEqual([
      'datasetMetadata',
      'sin id',
      'credentialsConfig',
    ]);
  });

  it('replaces by id', () => {
    const old: ProductSpecificationCharacteristic = { id: 'datasetMetadata', name: 'old' };
    const nuevo: ProductSpecificationCharacteristic = { id: 'datasetMetadata', name: 'new' };
    expect(mergeSpecCharacteristics([old], [nuevo])).toEqual([nuevo]);
  });

  it('overwrites v1 leftovers by valueType (policy and credentials with other ids)', () => {
    const v1Policy: ProductSpecificationCharacteristic = {
      id: 'legacyPolicy',
      valueType: 'authorizationPolicy',
    };
    const v1Cred: ProductSpecificationCharacteristic = {
      name: 'Configuración de credenciales',
      valueType: 'credentialsConfiguration',
    };
    const policy = buildPolicyChar({ odrlPathRegex: '^/a$' }, DID, 'https://h/p');
    const merged = mergeSpecCharacteristics(
      [keep, v1Policy, v1Cred],
      [policy, buildCredentialsChar()],
    );
    expect(merged.map((c) => c.id)).toEqual([
      'datasetMetadata',
      'policyConfig',
      'credentialsConfig',
    ]);
  });

  it('does not drop v1-typed chars when the upsert has no policy/credentials', () => {
    const v1Policy: ProductSpecificationCharacteristic = {
      id: 'x',
      valueType: 'authorizationPolicy',
    };
    expect(mergeSpecCharacteristics([v1Policy], [keep])).toEqual([v1Policy, keep]);
  });

  it('removes the requested ids', () => {
    const tok: ProductSpecificationCharacteristic = { id: 'tokenOfferConfig', name: 't' };
    expect(mergeSpecCharacteristics([keep, tok], [], ['tokenOfferConfig'])).toEqual([keep]);
  });

  it('handles undefined current', () => {
    expect(mergeSpecCharacteristics(undefined, [keep])).toEqual([keep]);
  });
});
