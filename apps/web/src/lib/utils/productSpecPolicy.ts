import type { ProductSpecification, ProductSpecificationCharacteristic } from '@/types/api';

/** Access policy and credential of a TMF v2 `ProductSpecification`. */

export const POLICY_CHAR_ID = 'policyConfig';
export const CREDENTIALS_CHAR_ID = 'credentialsConfig';
export const POLICY_VALUE_TYPE = 'authorizationPolicy';
export const CREDENTIALS_VALUE_TYPE = 'credentialsConfiguration';

/** Conservative format of `tmf:offerId`. */
export const OFFER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

/** Policy data filled in by the provider in the form. */
export interface PolicyFormValues {
  /** Regex of routes (`http:path`) sold by the offering. */
  odrlPathRegex: string;
  /** `tmf:offerId`: only on metered offerings. */
  odrlOfferId?: string;
  /** `tmf:usageQuotaBytesLimit`, positive integer. */
  odrlBytesLimit?: number;
  /** `tmf:usageQuotaRequestsLimit`, positive integer. */
  odrlRequestsLimit?: number;
}

/** Service input: form values plus the specification name. */
export type OdrlFormData = PolicyFormValues & { name?: string };

/** Whether `source` compiles as a regular expression. */
export const isValidRegex = (source: string): boolean => {
  try {
    // The regex is written by the provider; it is only compiled to validate it, never executed against data.
    // eslint-disable-next-line security/detect-non-literal-regexp
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extracts the host from a `did:web:<host>` DID.
 *
 * @throws {Error} If the DID is missing, not `did:web` or has an invalid host.
 */
export const getDidWebHost = (did: string): string => {
  if (!did.startsWith('did:web:')) {
    throw new Error(
      'El DID de la organización debe ser did:web:<host> para generar la política de acceso.',
    );
  }
  const raw = did.slice('did:web:'.length).split(':')[0] ?? '';
  const host = raw.replace(/%3a/gi, ':');
  const [name = '', port, ...rest] = host.split(':');
  const validPort = port === undefined || /^\d{1,5}$/.test(port);
  if (!/^[A-Za-z0-9.-]+$/.test(name) || !validPort || rest.length > 0) {
    throw new Error('El DID de la organización no contiene un host válido (did:web:<host>).');
  }
  return host;
};

/** Converts a name into a `[a-z0-9-]` slug. */
export const slugify = (name: string | undefined): string => {
  const dashed = (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 41);
  const parts = dashed.split('-').filter(Boolean);
  const slug = parts.join('-').slice(0, 40);
  return slug.endsWith('-') ? slug.slice(0, -1) : slug || 'spec';
};

const randomSuffix = (): string => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

/** Determines the template `odrl:uid`. */
export const resolvePolicyUid = (opts: {
  host: string;
  offerId?: string;
  name?: string;
  existingUid?: string;
}): string => {
  if (opts.existingUid?.startsWith('https://')) return opts.existingUid;
  const tail = opts.offerId ? opts.offerId : `${slugify(opts.name)}-${randomSuffix()}`;
  return `https://${opts.host}/policy/offer/${tail}`;
};

/** `credentialsConfig` characteristic. */
export const buildCredentialsChar = (): ProductSpecificationCharacteristic => ({
  id: CREDENTIALS_CHAR_ID,
  name: 'Credentials Config',
  valueType: CREDENTIALS_VALUE_TYPE,
  productSpecCharacteristicValue: [
    { isDefault: true, value: { credentialsType: 'ConsumerCredential', claims: [] } },
  ],
});

/** `policyConfig` characteristic with the ODRL v2 policy as an object. */
export const buildPolicyChar = (
  data: PolicyFormValues,
  did: string,
  uid: string,
): ProductSpecificationCharacteristic => {
  const offerId = data.odrlOfferId?.trim();
  const policy: Record<string, unknown> = {
    '@type': 'odrl:Policy',
    'odrl:uid': uid,
    ...(offerId && { 'tmf:offerId': offerId }),
    ...(data.odrlBytesLimit !== undefined && { 'tmf:usageQuotaBytesLimit': data.odrlBytesLimit }),
    ...(data.odrlRequestsLimit !== undefined && {
      'tmf:usageQuotaRequestsLimit': data.odrlRequestsLimit,
    }),
    'odrl:permission': {
      'odrl:assigner': { '@id': did },
      'odrl:target': {
        '@type': 'odrl:AssetCollection',
        'odrl:source': 'urn:asset',
        'odrl:refinement': {
          '@type': 'odrl:Constraint',
          'odrl:leftOperand': 'http:path',
          'odrl:operator': { '@id': 'odrl:regex' },
          'odrl:rightOperand': data.odrlPathRegex.trim(),
        },
      },
      'odrl:action': { '@id': 'odrl:use' },
    },
  };
  return {
    id: POLICY_CHAR_ID,
    name: 'Policy',
    valueType: POLICY_VALUE_TYPE,
    productSpecCharacteristicValue: [{ isDefault: true, value: policy }],
  };
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isPolicyChar = (c: ProductSpecificationCharacteristic): boolean =>
  c.id === POLICY_CHAR_ID || c.valueType === POLICY_VALUE_TYPE;

const isCredentialsChar = (c: ProductSpecificationCharacteristic): boolean =>
  c.id === CREDENTIALS_CHAR_ID || c.valueType === CREDENTIALS_VALUE_TYPE;

/** Reads the stored policy, if any. */
export const extractPolicy = (
  spec: ProductSpecification | undefined,
): Record<string, unknown> | undefined => {
  const char = spec?.productSpecCharacteristic?.find(isPolicyChar);
  const raw = char?.productSpecCharacteristicValue?.[0]?.value;
  if (isRecord(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

/** `odrl:uid` stored in the policy, if any. */
export const extractPolicyUid = (spec: ProductSpecification | undefined): string | undefined => {
  const uid = extractPolicy(spec)?.['odrl:uid'];
  return typeof uid === 'string' && uid ? uid : undefined;
};

const toPositiveInt = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : undefined;
};

const findPathRegex = (policy: Record<string, unknown>): string => {
  const permission = policy['odrl:permission'];
  const perm = Array.isArray(permission) ? permission[0] : permission;
  const target = isRecord(perm) ? perm['odrl:target'] : undefined;
  const refinement = isRecord(target) ? target['odrl:refinement'] : undefined;
  const constraints = Array.isArray(refinement) ? refinement : [refinement];
  const pathConstraint = constraints.find(
    (c) => isRecord(c) && c['odrl:leftOperand'] === 'http:path',
  );
  const operand = isRecord(pathConstraint) ? pathConstraint['odrl:rightOperand'] : undefined;
  return typeof operand === 'string' ? operand : '';
};

/** Form values from the existing policy. */
export const extractPolicyFormValues = (
  spec: ProductSpecification | undefined,
): PolicyFormValues => {
  const policy = extractPolicy(spec);
  if (!policy) return { odrlPathRegex: '' };
  const offerId = policy['tmf:offerId'];
  return {
    odrlPathRegex: findPathRegex(policy),
    odrlOfferId: typeof offerId === 'string' ? offerId : '',
    odrlBytesLimit: toPositiveInt(policy['tmf:usageQuotaBytesLimit']),
    odrlRequestsLimit: toPositiveInt(policy['tmf:usageQuotaRequestsLimit']),
  };
};

/** Merges current characteristics with new ones. */
export const mergeSpecCharacteristics = (
  current: ProductSpecificationCharacteristic[] | undefined,
  upsert: ProductSpecificationCharacteristic[],
  removeIds: string[] = [],
): ProductSpecificationCharacteristic[] => {
  const ids = new Set([...upsert.map((c) => c.id), ...removeIds]);
  const replacesPolicy = upsert.some(isPolicyChar);
  const replacesCredentials = upsert.some(isCredentialsChar);
  const kept = (current ?? []).filter(
    (c) =>
      !(c.id && ids.has(c.id)) &&
      !(replacesPolicy && isPolicyChar(c)) &&
      !(replacesCredentials && isCredentialsChar(c)),
  );
  return [...kept, ...upsert];
};
