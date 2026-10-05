const OIDC_ISSUER_URL = process.env.OIDC_ISSUER_URL;
const DISCOVERY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const OIDC_CLIENT_ID = process.env.OIDC_CLIENT_ID ?? '';
export const OIDC_CLIENT_SECRET = process.env.OIDC_CLIENT_SECRET;
export const OIDC_SCOPE = 'openid profile email';

/** Subset of the OpenID Provider metadata used by the login flow. */
export interface OidcConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri?: string;
  end_session_endpoint?: string;
}

let cachedConfig: OidcConfiguration | null = null;
let configCachedAt = 0;

/**
 * Fetches the OpenID Provider metadata from `${OIDC_ISSUER_URL}/.well-known/openid-configuration`.
 *
 * @throws {Error} If `OIDC_ISSUER_URL` is not set or the discovery request fails.
 */
export async function getOidcConfiguration(): Promise<OidcConfiguration> {
  if (!OIDC_ISSUER_URL) {
    throw new Error('OIDC_ISSUER_URL is not defined.');
  }

  const now = Date.now();
  if (cachedConfig && now - configCachedAt < DISCOVERY_CACHE_TTL_MS) return cachedConfig;

  const res = await fetch(`${OIDC_ISSUER_URL}/.well-known/openid-configuration`, {
    cache: 'no-store',
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);

  cachedConfig = (await res.json()) as OidcConfiguration;
  configCachedAt = now;
  return cachedConfig;
}

/** Redirect URI registered in the identity provider for this application. */
export function getRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback`;
}
