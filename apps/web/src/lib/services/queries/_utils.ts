import { getSession, type UserProfile } from '@/lib/session';

/**
 * Returns the authenticated user's profile from the active session.
 *
 * @throws {Error} If there is no authenticated user in the session.
 */
export async function getCurrentUser(): Promise<UserProfile> {
  const { userProfile } = await getSession();
  if (!userProfile?.sub) {
    throw new Error('No authenticated user in session');
  }
  // Here you define your business logic (tenant/organization context for API calls).
  return userProfile;
}

/**
 * Appends `?limit=N` to a collection URL.
 *
 * @example
 * withLimit('/tmf-api/productCatalogManagement/v4/catalog');
 * // '/tmf-api/productCatalogManagement/v4/catalog?limit=1000'
 */
export function withLimit(path: string, limit = 1000): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}limit=${limit}`;
}

const API_BASE = process.env.API_BASE_URL;

/** Returns the base URL or throws a clear error when it is not configured. */
function requireBaseUrl(baseUrl: string | undefined, envName: string): string {
  if (!baseUrl) throw new Error(`${envName} is not configured`);
  return baseUrl;
}

/**
 * Authenticated JSON request to the TM Forum API (`API_BASE_URL`).
 * Sends the session token as `Authorization: Bearer`; an explicit `bearerToken` takes precedence.
 *
 * @throws {Error} `HTTP ${status}: ${body}` when the response is not 2xx.
 *
 * @example
 * const catalog = await apiFetch<Catalog>('/tmf-api/productCatalogManagement/v4/catalog/123');
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  bearerToken?: string,
): Promise<T> {
  const { accessToken } = await getSession();
  const token = bearerToken ?? accessToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${requireBaseUrl(API_BASE, 'API_BASE_URL')}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<T>;
}

/**
 * Authenticated request that does not read the response body (e.g. `204 No Content` on DELETE).
 *
 * @throws {Error} `HTTP ${status}: ${body}` when the response is not 2xx.
 *
 * @example
 * await apiFetchVoid('/tmf-api/productCatalogManagement/v4/catalog/123', { method: 'DELETE' });
 */
export async function apiFetchVoid(path: string, init?: RequestInit): Promise<void> {
  const { accessToken } = await getSession();
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${requireBaseUrl(API_BASE, 'API_BASE_URL')}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
}

const CATALOG_PUBLIC_API_BASE = process.env.CATALOG_PUBLIC_API_BASE_URL;

/**
 * Anonymous JSON request to the public catalog API (`CATALOG_PUBLIC_API_BASE_URL`).
 * No session and no `Authorization` header. Use it only in public catalog pages.
 *
 * @throws {Error} `HTTP ${status}: ${body}` when the response is not 2xx.
 *
 * @example
 * const offerings = await apiFetchPublic<ProductOffering[]>(
 *   withLimit('/tmf-api/productCatalogManagement/v4/productOffering'),
 * );
 */
export async function apiFetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${requireBaseUrl(CATALOG_PUBLIC_API_BASE, 'CATALOG_PUBLIC_API_BASE_URL')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<T>;
}
