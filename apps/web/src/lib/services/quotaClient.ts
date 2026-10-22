/** Client for a provider's `/quota`. Server-only. */
import {
  getMarketplaceCredential,
  readJwtExpiryMs,
  resetBackendCredentialCache,
} from '@/lib/services/backendCredential';
import { OFFER_ID_PATTERN } from '@/lib/utils/productSpecPolicy';
import {
  isValidConsumerDid,
  parseQuotaResponse,
  type ProviderEndpoints,
  type QuotaResponse,
} from '@/lib/utils/quota';

const QUOTA_SCOPE = 'default';
const REQUEST_TIMEOUT_MS = 10 * 1000;
const MAX_BODY_CHARS = 64 * 1024;
const EXPIRY_MARGIN_MS = 60 * 1000;
const DEFAULT_TOKEN_TTL_MS = 25 * 60 * 1000;
/** Attempts: cached, new token, new credential and token. */
const MAX_ATTEMPTS = 3;

interface CachedToken {
  readonly value: string;
  readonly expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
const tokenInFlight = new Map<string, Promise<string>>();

/** Clears the `quota` token cache (tests). */
export function resetQuotaTokenCache(): void {
  tokenCache.clear();
  tokenInFlight.clear();
}

type QuotaHttpError = Error & { readonly status: number };

function quotaHttpError(step: string, status: number): QuotaHttpError {
  return Object.assign(new Error(`Quota (${step}): HTTP ${status}`), { status });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && (error as Partial<QuotaHttpError>).status === 401;
}

// Only step and status in errors: the body could reflect sensitive data.
async function readJson(step: string, res: Response): Promise<unknown> {
  if (!res.ok) throw quotaHttpError(step, res.status);
  const text = await res.text();
  if (text.length > MAX_BODY_CHARS) throw new Error(`Quota (${step}): respuesta demasiado grande`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Quota (${step}): respuesta no es JSON`);
  }
}

// `redirect: 'manual'`: a 3xx is not followed (the token must not travel to another host) and counts as an error.
function guardedFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function requestQuotaToken(verifierBase: string): Promise<CachedToken> {
  const credential = await getMarketplaceCredential();
  const res = await guardedFetch(`${verifierBase}/services/quota/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'vp_token',
      scope: QUOTA_SCOPE,
      vp_token: credential,
    }).toString(),
  });
  const body = await readJson('quota-token', res);
  const accessToken = (body as { access_token?: unknown } | null)?.access_token;
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('Quota (quota-token): sin access_token');
  }
  const expiresIn = (body as { expires_in?: unknown }).expires_in;
  const expiresAt =
    readJwtExpiryMs(accessToken) ??
    Date.now() + (typeof expiresIn === 'number' ? expiresIn * 1000 : DEFAULT_TOKEN_TTL_MS);
  return { value: accessToken, expiresAt };
}

async function getQuotaToken(verifierBase: string): Promise<string> {
  const cached = tokenCache.get(verifierBase);
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.value;
  let pending = tokenInFlight.get(verifierBase);
  if (!pending) {
    pending = requestQuotaToken(verifierBase)
      .then((fresh) => {
        tokenCache.set(verifierBase, fresh);
        return fresh.value;
      })
      .finally(() => {
        tokenInFlight.delete(verifierBase);
      });
    tokenInFlight.set(verifierBase, pending);
  }
  return pending;
}

export interface QuotaRequest {
  endpoints: ProviderEndpoints;
  /** Consumer organization DID (`did:web:…`). */
  consumerDid: string;
  /** Policy `tmf:offerId` (not the TMF id). */
  offerId: string;
}

function buildQuotaUrl(req: QuotaRequest): string {
  if (!isValidConsumerDid(req.consumerDid)) throw new Error('DID del consumer no válido');
  if (!OFFER_ID_PATTERN.test(req.offerId)) throw new Error('Identificador de oferta no válido');
  return `${req.endpoints.contractBase}/quota/${req.consumerDid}/${encodeURIComponent(req.offerId)}`;
}

async function requestQuota(req: QuotaRequest, url: string): Promise<QuotaResponse> {
  const token = await getQuotaToken(req.endpoints.verifierBase);
  const res = await guardedFetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseQuotaResponse(await readJson('quota', res));
}

/**
 * @summary Queries a consumer's usage on a provider's metered offering.
 *
 * @param {QuotaRequest}  req - Validated endpoints, consumer DID and `tmf:offerId`.
 * @returns {Promise<QuotaResponse>} Normalized response (`cap: 0` = unlimited).
 * @throws {Error} If the data is invalid or the provider/verifier fails.
 */
export async function fetchProviderQuota(req: QuotaRequest): Promise<QuotaResponse> {
  const url = buildQuotaUrl(req);

  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await requestQuota(req, url);
    } catch (error) {
      if (!isUnauthorized(error)) throw error;
      tokenCache.delete(req.endpoints.verifierBase);
      if (attempt === MAX_ATTEMPTS - 1) resetBackendCredentialCache();
    }
  }
  return requestQuota(req, url);
}
