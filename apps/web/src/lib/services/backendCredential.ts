/** Marketplace backend credential and token (v2). Server-only. */
import type { ProductOrder } from '@/types/api';

import {
  MARKETPLACE_CREDENTIAL_CONFIGURATION_ID,
  MARKETPLACE_ISSUER_CLIENT_ID,
  MARKETPLACE_ISSUER_URL,
  VERIFIER_BACKEND_SCOPE,
  VERIFIER_BACKEND_TOKEN_URL,
} from './verifier.constants';

/** States the backend can set on an order. */
export type BackendOrderState = 'completed' | 'cancelled' | 'rejected';

const ORDER_PATH = '/tmf-api/productOrderingManagement/v4/productOrder';
const PRE_AUTHORIZED_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';
const ORDER_ID_PATTERN = /^[A-Za-z0-9:._-]+$/;

/** Margin before `exp` at which renewal starts. */
const EXPIRY_MARGIN_MS = 60 * 1000;
/** Default TTL when `exp` cannot be read. */
const DEFAULT_CREDENTIAL_TTL_MS = 55 * 60 * 1000;
const DEFAULT_TOKEN_TTL_MS = 25 * 60 * 1000;

interface CachedValue {
  readonly value: string;
  readonly expiresAt: number;
}

let credentialCache: CachedValue | null = null;
let tokenCache: CachedValue | null = null;
let credentialInFlight: Promise<string> | null = null;
let tokenInFlight: Promise<string> | null = null;

/** Clears the in-memory caches. */
export function resetBackendCredentialCache(): void {
  credentialCache = null;
  tokenCache = null;
  credentialInFlight = null;
  tokenInFlight = null;
}

function isFresh(cached: CachedValue | null): cached is CachedValue {
  return cached !== null && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now();
}

/** Reads `exp` (epoch ms) from the first JWT segment; `null` if unreadable. */
export function readJwtExpiryMs(jwt: string): number | null {
  const [, payload] = jwt.split('~')[0].split('.');
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const exp = (parsed as { exp?: unknown } | null)?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function getBackendUserCredentials(): { username: string; password: string } {
  const username = process.env.MARKETPLACE_BACKEND_USER;
  const password = process.env.MARKETPLACE_BACKEND_PASSWORD;
  if (!username || !password) {
    throw new Error(
      'Credencial del backend no configurada: faltan MARKETPLACE_BACKEND_USER o MARKETPLACE_BACKEND_PASSWORD',
    );
  }
  return { username, password };
}

/**
 * Fails fast, without network, if the technical-user configuration is missing.
 *
 * @throws {Error} If `MARKETPLACE_BACKEND_USER` or `MARKETPLACE_BACKEND_PASSWORD` is missing.
 */
export function assertBackendCredentialConfigured(): void {
  getBackendUserCredentials();
}

// Errors include only the step and status: the body could reflect sensitive data.
async function requestJson<T>(step: string, url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Backend credential (${step}): HTTP ${res.status}`);
  return (await res.json()) as T;
}

function formInit(body: Record<string, string>): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  };
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  authorization_details?: { credential_identifiers?: string[] }[];
}

interface CredentialOffer {
  grants?: Record<string, { 'pre-authorized_code'?: string } | undefined>;
}

interface CredentialResponse {
  credential?: string;
  credentials?: ({ credential?: string } | string)[];
}

function extractCredential(body: CredentialResponse): string | undefined {
  if (typeof body.credential === 'string') return body.credential;
  const first = body.credentials?.[0];
  return typeof first === 'string' ? first : first?.credential;
}

async function fetchMarketplaceCredential(): Promise<CachedValue> {
  const { username, password } = getBackendUserCredentials();
  const openid = `${MARKETPLACE_ISSUER_URL}/protocol/openid-connect/token`;

  // 1. Technical user token.
  const userToken = await requestJson<TokenResponse>(
    'user-token',
    openid,
    formInit({
      grant_type: 'password',
      client_id: MARKETPLACE_ISSUER_CLIENT_ID,
      username,
      password,
      scope: 'openid',
    }),
  );
  if (!userToken.access_token) throw new Error('Backend credential (user-token): sin access_token');
  const userAuth = { Authorization: `Bearer ${userToken.access_token}` };

  // 2. Pre-authorized credential offer: returns `issuer` and `nonce`.
  const offerRef = await requestJson<{ issuer?: string; nonce?: string }>(
    'create-offer',
    `${MARKETPLACE_ISSUER_URL}/protocol/oid4vc/create-credential-offer?credential_configuration_id=${MARKETPLACE_CREDENTIAL_CONFIGURATION_ID}&pre_authorized=true`,
    { headers: userAuth },
  );
  if (!offerRef.issuer || !offerRef.nonce) {
    throw new Error('Backend credential (create-offer): respuesta sin issuer/nonce');
  }

  // 3. The offer, with the `pre-authorized_code`.
  const offer = await requestJson<CredentialOffer>(
    'get-offer',
    `${offerRef.issuer.endsWith('/') ? offerRef.issuer.slice(0, -1) : offerRef.issuer}/${offerRef.nonce}`,
    { headers: userAuth },
  );
  const preAuthorizedCode = new Map(Object.entries(offer.grants ?? {})).get(PRE_AUTHORIZED_GRANT)?.[
    'pre-authorized_code'
  ];
  if (!preAuthorizedCode)
    throw new Error('Backend credential (get-offer): sin pre-authorized_code');

  // 4. Pre-authorized code exchange.
  const credentialToken = await requestJson<TokenResponse>(
    'preauth-token',
    openid,
    formInit({ grant_type: PRE_AUTHORIZED_GRANT, 'pre-authorized_code': preAuthorizedCode }),
  );
  if (!credentialToken.access_token) {
    throw new Error('Backend credential (preauth-token): sin access_token');
  }

  // 5. The SD-JWT credential.
  const credentialIdentifier =
    credentialToken.authorization_details?.[0]?.credential_identifiers?.[0];
  const issued = await requestJson<CredentialResponse>(
    'credential',
    `${MARKETPLACE_ISSUER_URL}/protocol/oid4vc/credential`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentialToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        credentialIdentifier
          ? { credential_identifier: credentialIdentifier }
          : { credential_configuration_id: MARKETPLACE_CREDENTIAL_CONFIGURATION_ID },
      ),
    },
  );
  const credential = extractCredential(issued);
  if (!credential) throw new Error('Backend credential (credential): respuesta sin credencial');

  return {
    value: credential,
    expiresAt: readJwtExpiryMs(credential) ?? Date.now() + DEFAULT_CREDENTIAL_TTL_MS,
  };
}

/**
 * @summary Gets the backend `MarketplaceCredential` (SD-JWT), cached in server memory.
 *
 * @returns {Promise<string>} The credential.
 * @throws {Error} If env vars are missing or the issuer fails.
 */
export async function getMarketplaceCredential(): Promise<string> {
  if (isFresh(credentialCache)) return credentialCache.value;
  credentialInFlight ??= fetchMarketplaceCredential()
    .then((fresh) => {
      credentialCache = fresh;
      return fresh.value;
    })
    .finally(() => {
      credentialInFlight = null;
    });
  return credentialInFlight;
}

async function fetchBackendToken(): Promise<CachedValue> {
  const credential = await getMarketplaceCredential();
  const res = await requestJson<TokenResponse>(
    'backend-token',
    VERIFIER_BACKEND_TOKEN_URL,
    formInit({
      grant_type: 'vp_token',
      scope: VERIFIER_BACKEND_SCOPE,
      vp_token: credential,
    }),
  );
  if (!res.access_token) throw new Error('Backend credential (backend-token): sin access_token');
  const expiresAt =
    readJwtExpiryMs(res.access_token) ??
    (typeof res.expires_in === 'number'
      ? Date.now() + res.expires_in * 1000
      : Date.now() + DEFAULT_TOKEN_TTL_MS);
  return { value: res.access_token, expiresAt };
}

/**
 * @summary Gets the verifier `scope=backend` token, cached.
 *
 * @returns {Promise<string>} The backend `access_token`.
 * @throws {Error} If the credential or verifier fails.
 */
export async function getBackendToken(): Promise<string> {
  if (isFresh(tokenCache)) return tokenCache.value;
  tokenInFlight ??= fetchBackendToken()
    .then((fresh) => {
      tokenCache = fresh;
      return fresh.value;
    })
    .finally(() => {
      tokenInFlight = null;
    });
  return tokenInFlight;
}

async function patchWithToken(orderId: string, state: BackendOrderState): Promise<Response> {
  const base = process.env.API_BASE_URL;
  if (!base) throw new Error('No se ha definido API_BASE_URL');
  return fetch(`${base}${ORDER_PATH}/${orderId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${await getBackendToken()}`,
      // `application/merge-patch+json` returns 415 in v2.
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ state }),
  });
}

/**
 * @summary Changes an order's state using the backend token.
 *
 * @param {string}            orderId - Order id.
 * @param {BackendOrderState} state - `completed`, `cancelled` or `rejected`.
 * @returns {Promise<ProductOrder>} The updated order.
 * @throws {Error} `HTTP ${status}: ${body}` if the PATCH fails; credential error if no token.
 */
export async function backendPatchOrderState(
  orderId: string,
  state: BackendOrderState,
): Promise<ProductOrder> {
  if (!ORDER_ID_PATTERN.test(orderId)) throw new Error('Identificador de pedido no válido');
  let res = await patchWithToken(orderId, state);
  if (res.status === 401) {
    resetBackendCredentialCache();
    res = await patchWithToken(orderId, state);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  return (await res.json()) as ProductOrder;
}
