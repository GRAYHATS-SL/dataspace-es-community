export const VERIFIER_BASE_URL =
  process.env.VERIFIER_BASE_URL ?? '';

export const CLIENT_ID = 'tmf-api';

export const VERIFIER_LOGIN_QR_URL = `${VERIFIER_BASE_URL}/api/v2/loginQR`;

export const VERIFIER_SCOPE = 'default';

// Code exchange: `POST /token`. Env override if the verifier exposes it on a different path.
export const VERIFIER_TOKEN_URL = process.env.VERIFIER_TOKEN_URL ?? `${VERIFIER_BASE_URL}/token`;

/** Target DID of the roles in `credentialSubject.roles`. */
export const MARKETPLACE_DID = process.env.MARKETPLACE_DID ?? '';

export const VERIFIER_JWKS_URI = `${VERIFIER_BASE_URL}/.well-known/jwks`;

/** The verifier issues `iss` equal to its base URL. */
export const VERIFIER_ISSUER = VERIFIER_BASE_URL;

// Only value read on the client: must be NEXT_PUBLIC_ (inlined at build).
export const VERIFIER_WS_URL =
  process.env.NEXT_PUBLIC_VERIFIER_WS_URL ?? '';

// The verifier login session lasts 2 min: a new QR is requested 10 s before it expires.
export const VERIFIER_QR_REFRESH_MS = 110 * 1000;

export const VERIFIER_JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function withoutTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

// ─── Backend credential and token ───

/** Issuer realm of the `MarketplaceCredential`. */
export const MARKETPLACE_ISSUER_URL = withoutTrailingSlash(
  process.env.MARKETPLACE_ISSUER_URL ?? '',
);

/** Issuer OIDC client for the backend technical user. */
export const MARKETPLACE_ISSUER_CLIENT_ID = 'dsc-holder';

export const MARKETPLACE_CREDENTIAL_CONFIGURATION_ID = 'marketplace-credential';

/** Backend token request (`grant_type=vp_token`, `scope=backend`). */
export const VERIFIER_BACKEND_TOKEN_URL = `${VERIFIER_BASE_URL}/services/tmf-api/token`;

export const VERIFIER_BACKEND_SCOPE = 'backend';
