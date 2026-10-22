import {
  extractPolicyFormValues,
  getDidWebHost,
  OFFER_ID_PATTERN,
} from '@/lib/utils/productSpecPolicy';
import type { Characteristic, ProductSpecification } from '@/types/api';

/** Offering usage measured at a provider. */

/** Trusted domain suffix of providers. */
const getProviderDomainSuffix = (): string => process.env.PROVIDER_DOMAIN_SUFFIX ?? '';
const CONTRACT_HOST_PREFIX = 'contract.';
const VERIFIER_HOST_PREFIX = 'verifier.';
const CONSUMER_DID_PATTERN = /^did:web:[A-Za-z0-9][A-Za-z0-9.-]*$/;
const IP_LITERAL_PATTERN = /^[\d.]+$/;

/** Response of `/quota`. */
export interface QuotaResponse {
  allowed: boolean;
  bytesCap: number;
  bytesConsumed: number;
  bytesOk: boolean;
  requestsCap: number;
  requestsConsumed: number;
  requestsOk: boolean;
}

/** Measured terms of an offering, read from its `authorizationPolicy`. */
export interface QuotaOfferTerms {
  /** `tmf:offerId`. */
  offerId: string;
  bytesLimit?: number;
  requestsLimit?: number;
}

/** Validated provider endpoints. */
export interface ProviderEndpoints {
  /** Origin of `contractManagement.address`, without trailing slash. */
  contractBase: string;
  /** Origin of the provider verifier, without trailing slash. */
  verifierBase: string;
}

export type QuotaStatus = 'active' | 'exhausted' | 'unlimited' | 'not-activated';

export interface QuotaMetric {
  /** `false` if the cap is 0 (unlimited). */
  limited: boolean;
  cap: number;
  consumed: number;
  /** Remaining amount, never negative. */
  remaining: number;
  /** Amount consumed above the cap. */
  exceeded: boolean;
  ok: boolean;
}

export interface QuotaView {
  status: QuotaStatus;
  bytes: QuotaMetric;
  requests: QuotaMetric;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const toCount = (v: unknown, field: string): number => {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v;
  throw new Error(`Respuesta de /quota no válida (${field})`);
};

const toBool = (v: unknown, field: string): boolean => {
  if (typeof v === 'boolean') return v;
  throw new Error(`Respuesta de /quota no válida (${field})`);
};

/**
 * Validates and normalizes the `/quota` body.
 *
 * @throws {Error} If a field is missing or has an unexpected type.
 */
export function parseQuotaResponse(body: unknown): QuotaResponse {
  if (!isRecord(body)) throw new Error('Respuesta de /quota no válida');
  return {
    allowed: toBool(body.allowed, 'allowed'),
    bytesCap: toCount(body.bytes_cap, 'bytes_cap'),
    bytesConsumed: toCount(body.bytes_consumed, 'bytes_consumed'),
    bytesOk: toBool(body.bytes_ok, 'bytes_ok'),
    requestsCap: toCount(body.requests_cap, 'requests_cap'),
    requestsConsumed: toCount(body.requests_consumed, 'requests_consumed'),
    requestsOk: toBool(body.requests_ok, 'requests_ok'),
  };
}

/** `contractManagement.address` of an organization record. */
export function readContractAddress(
  value: Characteristic['value'] | undefined,
): string | undefined {
  let raw: unknown = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  const address = isRecord(raw) ? raw.address : undefined;
  return typeof address === 'string' && address ? address : undefined;
}

/** DID of an organization, if it is text. */
export function readOrganizationDid(
  value: Characteristic['value'] | undefined,
): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

/** Validates the consumer DID before using it in the `/quota` path. */
export function isValidConsumerDid(did: string): boolean {
  return CONSUMER_DID_PATTERN.test(did);
}

/**
 * Validates `contractManagement.address` and derives the provider verifier.
 *
 * @throws {Error} If the address breaks any rule.
 */
export function resolveProviderEndpoints(address: string, providerDid: string): ProviderEndpoints {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    throw new Error('La dirección de contract management del provider no es válida.');
  }
  const didHost = getDidWebHost(providerDid).toLowerCase();
  const host = url.hostname.toLowerCase();
  const suffix = getProviderDomainSuffix().toLowerCase();
  const valid =
    suffix !== '' &&
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.port &&
    (url.pathname === '/' || url.pathname === '') &&
    !url.search &&
    !url.hash &&
    !IP_LITERAL_PATTERN.test(host) &&
    host.endsWith(suffix) &&
    didHost.endsWith(suffix) &&
    host === `${CONTRACT_HOST_PREFIX}${didHost}`;
  if (!valid) {
    throw new Error('La dirección de contract management del provider no es de confianza.');
  }
  return {
    contractBase: `https://${host}`,
    verifierBase: `https://${VERIFIER_HOST_PREFIX}${didHost}`,
  };
}

/** Measured terms of a specification: `tmf:offerId` and policy limits. */
export function getQuotaOfferTerms(
  spec: ProductSpecification | undefined,
): QuotaOfferTerms | undefined {
  const values = extractPolicyFormValues(spec);
  const offerId = values.odrlOfferId?.trim();
  if (!offerId || !OFFER_ID_PATTERN.test(offerId)) return undefined;
  return {
    offerId,
    bytesLimit: values.odrlBytesLimit,
    requestsLimit: values.odrlRequestsLimit,
  };
}

const buildMetric = (cap: number, consumed: number, ok: boolean): QuotaMetric => ({
  limited: cap > 0,
  cap,
  consumed,
  remaining: Math.max(cap - consumed, 0),
  exceeded: cap > 0 && consumed > cap,
  ok,
});

/** Interprets `/quota` for an offering with known limits. */
export function interpretQuota(quota: QuotaResponse, terms: QuotaOfferTerms): QuotaView {
  const bytes = buildMetric(quota.bytesCap, quota.bytesConsumed, quota.bytesOk);
  const requests = buildMetric(quota.requestsCap, quota.requestsConsumed, quota.requestsOk);
  const expected: QuotaMetric[] = [
    ...(terms.bytesLimit === undefined ? [] : [bytes]),
    ...(terms.requestsLimit === undefined ? [] : [requests]),
  ];
  let status: QuotaStatus = 'active';
  if (expected.length === 0) status = 'unlimited';
  else if (expected.every((m) => !m.limited)) status = 'not-activated';
  else if (!quota.allowed) status = 'exhausted';
  return { status, bytes, requests };
}

/** Formats bytes as B / KB / MB (base 1024). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Number.isInteger(kb) ? kb : kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}
