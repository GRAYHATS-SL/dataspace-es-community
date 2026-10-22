import { getSession } from '@/lib/session';
import { deriveReviewsAuthorId } from '@/lib/utils/reviewsAuthorId';
import type { RelatedParty } from '@/types/api';

/**
 * @summary Gets the authenticated user's DID from the active session.
 *
 * @returns {Promise<string>} The JWT `sub` claim (the DID).
 *
 * @throws {Error} If there is no session or no `sub`.
 *
 * @example
 * const did = await getCurrentUserDid();
 * // 'did:web:marketplace.example.org'
 */
export async function getCurrentUserDid(): Promise<string> {
  const { userProfile } = await getSession();
  if (!userProfile?.sub) {
    throw new Error('No authenticated user DID (sub) in session');
  }
  return userProfile.sub;
}

/**
 * @summary Gets the authenticated user's organization id from the active session.
 *
 * @returns {Promise<string>} The session profile's `organizationId`.
 *
 * @throws {Error} If there is no session or no `organizationId`.
 *
 * @example
 * const orgId = await getCurrentUserOrganizationId();
 * // 'urn:ngsi-ld:organization:abc123'
 */
export async function getCurrentUserOrganizationId(): Promise<string> {
  const { userProfile } = await getSession();
  if (!userProfile?.organizationId) {
    throw new Error('No organizationId in session — party lookup falló en el login');
  }
  return userProfile.organizationId;
}

/**
 * @summary Gets the authenticated user's author id (HMAC of the email).
 *
 * @returns {Promise<string>} Stable hex hash per person.
 *
 * @throws {Error} If there is no session or no email.
 *
 * @example
 * const authorId = await getCurrentUserAuthorId();
 */
export async function getCurrentUserAuthorId(): Promise<string> {
  const { userProfile } = await getSession();
  if (!userProfile?.email) {
    throw new Error('No email en la sesión — no se puede identificar al autor');
  }
  return deriveReviewsAuthorId(userProfile.email);
}

/**
 * @summary Builds the `RelatedParty` of the authenticated organization with role `provider`.
 *
 * @returns {Promise<RelatedParty>} The `RelatedParty` object.
 *
 * @throws {Error} If the session has no `organizationId`.
 *
 * @example
 * const rp = await getCurrentUserRelatedParty();
 * // { id: 'urn:ngsi-ld:organization:abc123', name: 'ACME', role: 'provider', '@referredType': 'Organization' }
 */
export async function getCurrentUserRelatedParty(): Promise<RelatedParty> {
  const id = await getCurrentUserOrganizationId();
  const { userProfile } = await getSession();
  const name = userProfile?.organizationName;
  return {
    id,
    ...(name && { name }),
    role: 'provider',
    '@referredType': 'Organization',
  };
}

/**
 * @summary Injects the active organization's `relatedParty` into a POST payload.
 *
 * @param {T}  payload - TMForum create payload with optional `relatedParty`.
 * @returns {Promise<T>} Payload with `relatedParty` filled in.
 *
 * @throws {Error} If the session has no `organizationId`.
 *
 * @example
 * const body = await injectRelatedParty({ name: 'Mi catálogo' });
 * // { name: 'Mi catálogo', relatedParty: [{ id: '...', role: 'provider', '@referredType': 'Organization' }] }
 */
export async function injectRelatedParty<T extends { relatedParty?: RelatedParty[] }>(
  payload: T,
): Promise<T> {
  const rp = await getCurrentUserRelatedParty();
  const existing = payload.relatedParty ?? [];
  const alreadyPresent = existing.some((p) => p.id === rp.id);
  return {
    ...payload,
    relatedParty: alreadyPresent ? existing : [...existing, rp],
  };
}

/**
 * @summary Removes duplicate array items by `id`.
 *
 * @param {T[]}  items - Entities with optional `id`.
 * @returns {T[]} Array without duplicates, original order preserved.
 *
 * @example
 * const unique = deduplicateById([{ id: '1', name: 'A' }, { id: '1', name: 'A' }]);
 * // [{ id: '1', name: 'A' }]
 */
// The backend may return duplicates — remove them by id.
export function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * @summary Appends `?limit=N` to a collection URL.
 *
 * @param {string}  path - API path, with or without a query string.
 * @param {number}  [limit=1000] - Maximum number of results.
 * @returns {string} URL with `limit` added.
 *
 * @example
 * withLimit('/tmf-api/productCatalogManagement/v4/catalog');
 * // '/tmf-api/productCatalogManagement/v4/catalog?limit=1000'
 *
 * withLimit('/tmf-api/productCatalogManagement/v4/catalog?lifecycleStatus=Launched', 500);
 */
// Appends ?limit=N to a collection URL to avoid backend pagination truncation.
export function withLimit(path: string, limit = 1000): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}limit=${limit}`;
}

/**
 * @summary Filters entities in memory whose `relatedParty` matches the active organization.
 *
 * @param {T[]}  items - Entities with optional `relatedParty`.
 * @returns {Promise<T[]>} Entities owned by the active organization.
 *
 * @throws {Error} If the session has no `organizationId`.
 *
 * @example
 * const myCatalogs = await filterByRelatedParty(allCatalogs);
 */
// Filters in memory by owning organization. The backend persists relatedParty but does not filter by it on GET.
export async function filterByRelatedParty<T extends { relatedParty?: RelatedParty[] }>(
  items: T[],
): Promise<T[]> {
  const orgId = await getCurrentUserOrganizationId();
  return items.filter((item) => isOwnedBy(item, orgId));
}

/**
 * @summary Tells whether an entity's `relatedParty` belongs to the given organization.
 *
 * @param {T}       item - Entity with optional `relatedParty`.
 * @param {string}  orgId - Organization id to check.
 * @returns {boolean} `true` if the organization is listed as owner.
 */
export function isOwnedBy<T extends { relatedParty?: RelatedParty[] }>(
  item: T,
  orgId: string,
): boolean {
  return !!item.relatedParty?.some(
    (p) =>
      p.id === orgId &&
      (!p.role || p.role.toLowerCase() === 'provider' || p.role.toLowerCase() === 'owner'),
  );
}

export type AppRole = 'ADMIN' | 'SELLER' | 'BUYER';

/**
 * @summary Uppercased roles of the active session.
 *
 * @returns {Promise<Set<string>>} Set of roles; empty if no session.
 */
export async function getSessionRoles(): Promise<Set<string>> {
  const { userProfile } = await getSession();
  return new Set((userProfile?.roles ?? []).map((r) => r.toUpperCase()));
}

/**
 * @summary Tells whether the active session has the ADMIN role.
 */
export async function isAdminSession(): Promise<boolean> {
  return (await getSessionRoles()).has('ADMIN');
}

/**
 * @summary Requires the session to have one of the given roles (ADMIN always passes).
 *
 * @param {AppRole[]}  allowed - Accepted roles besides ADMIN.
 *
 * @throws {Error} `Forbidden` if the user has none of the roles.
 */
export async function requireRole(...allowed: AppRole[]): Promise<void> {
  const roles = await getSessionRoles();
  if (roles.has('ADMIN') || allowed.some((r) => roles.has(r))) return;
  throw new Error(`Forbidden: se requiere rol ${allowed.join(' o ')}`);
}

/**
 * @summary Requires `id` to be the session's organization (ADMIN may use any).
 *
 * @throws {Error} `Forbidden` if the id differs from the active organization.
 */
export async function assertOwnOrganization(id: string): Promise<void> {
  if (await isAdminSession()) return;
  const orgId = await getCurrentUserOrganizationId();
  if (id !== orgId) throw new Error('Forbidden: solo puedes modificar tu propia organización');
}

/**
 * @summary Removes `relatedParty` from a PATCH payload to prevent ownership transfer.
 */
export function withoutRelatedParty<T extends object>(payload: T): Omit<T, 'relatedParty'> {
  const copy: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
  delete copy.relatedParty;
  return copy as Omit<T, 'relatedParty'>;
}

/**
 * @summary Tells whether a `relatedParty` role is the buyer organization.
 */
export function isBuyerRole(role?: string): boolean {
  const normalized = role?.toLowerCase();
  return normalized === 'customer' || normalized === 'buyer';
}

/**
 * @summary Filters entities in memory where the active organization is the buyer.
 *
 * @param {T[]}  items - Entities (typically product orders).
 * @returns {Promise<T[]>} Entities where the active organization is the buyer.
 *
 * @throws {Error} If the session has no `organizationId`.
 *
 * @example
 * const myPurchases = await filterAsBuyer(allOrders);
 */
// Filters orders where the org acts as buyer.
export async function filterAsBuyer<T extends { relatedParty?: RelatedParty[] }>(
  items: T[],
): Promise<T[]> {
  const orgId = await getCurrentUserOrganizationId();
  return items.filter((item) =>
    item.relatedParty?.some((p) => p.id === orgId && isBuyerRole(p.role)),
  );
}

/**
 * @summary Filters entities in memory where the active organization is the seller.
 *
 * @param {T[]}  items - Entities (typically product orders).
 * @returns {Promise<T[]>} Entities where the active organization is the seller.
 *
 * @throws {Error} If the session has no `organizationId`.
 *
 * @example
 * const mySales = await filterAsSeller(allOrders);
 */
// Filters orders where the org acts as seller.
export async function filterAsSeller<T extends { relatedParty?: RelatedParty[] }>(
  items: T[],
): Promise<T[]> {
  const orgId = await getCurrentUserOrganizationId();
  return items.filter((item) =>
    item.relatedParty?.some((p) => p.id === orgId && p.role?.toLowerCase() === 'seller'),
  );
}

function requireEnv(name: 'API_BASE_URL' | 'CATALOG_PUBLIC_API_BASE_URL'): string {
  const value =
    name === 'API_BASE_URL' ? process.env.API_BASE_URL : process.env.CATALOG_PUBLIC_API_BASE_URL;
  if (!value) throw new Error(`No se ha definido ${name}`);
  return value;
}

/**
 * @summary Error response body suitable for showing to the user.
 */
async function errorBody(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text || /^\s*<(!doctype|html)/i.test(text)) return res.statusText || 'Error del servidor';
  return text.length > 500 ? `${text.slice(0, 500)}…` : text;
}

/**
 * @summary Makes an authenticated HTTP call to the TMForum API and parses the JSON response.
 *
 * @param {string}       path - API path relative to `API_BASE_URL`.
 * @param {RequestInit}  [init] - `fetch` options.
 * @param {string}       [bearerToken] - Explicit JWT; defaults to the session token.
 * @returns {Promise<T>} Response parsed as `T`.
 *
 * @throws {Error} `HTTP ${status}: ${body}` on a non-2xx response.
 *
 * @example
 * const catalog = await apiFetch<Catalog>('/tmf-api/productCatalogManagement/v4/catalog/123');
 *
 * @example
 * const created = await apiFetch<Catalog>('/tmf-api/productCatalogManagement/v4/catalog', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'Mi catálogo' }),
 * });
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  bearerToken?: string,
): Promise<T> {
  const res = await authFetch(path, init, bearerToken);
  return res.json() as Promise<T>;
}

async function authFetch(
  path: string,
  init?: RequestInit,
  bearerToken?: string,
): Promise<Response> {
  const { accessToken } = await getSession();
  const token = bearerToken ?? accessToken;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${requireEnv('API_BASE_URL')}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await errorBody(res)}`);
  return res;
}

/**
 * @summary Makes an authenticated HTTP call to the TMForum API without parsing the response.
 *
 * @param {string}       path - API path.
 * @param {RequestInit}  [init] - `fetch` options.
 * @returns {Promise<void>}
 *
 * @throws {Error} `HTTP ${status}: ${body}` on a non-2xx response.
 *
 * @example
 * await apiFetchVoid('/tmf-api/productCatalogManagement/v4/catalog/123', { method: 'DELETE' });
 */
// For DELETE and other operations that return 204 No Content.
export async function apiFetchVoid(path: string, init?: RequestInit): Promise<void> {
  const { accessToken } = await getSession();
  const headers: Record<string, string> = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${requireEnv('API_BASE_URL')}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await errorBody(res)}`);
}

/**
 * @summary Makes an anonymous HTTP call to the public catalog backend and parses the JSON response.
 *
 * @param {string}       path - API path relative to `CATALOG_PUBLIC_API_BASE_URL`.
 * @param {RequestInit}  [init] - `fetch` options.
 * @returns {Promise<T>} Response parsed as `T`.
 *
 * @throws {Error} `HTTP ${status}: ${body}` on a non-2xx response.
 *
 * @example
 * const offerings = await apiFetchPublic<ProductOffering[]>(
 *   withLimit('/tmf-api/productCatalogManagement/v4/productOffering'),
 * );
 */
export async function apiFetchPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await publicFetch(path, init);
  return res.json() as Promise<T>;
}

async function publicFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${requireEnv('CATALOG_PUBLIC_API_BASE_URL')}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await errorBody(res)}`);
  return res;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

async function fetchAllPages<T>(
  path: string,
  fetchPage: (pagePath: string) => Promise<Response>,
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchPage(`${withLimit(path, PAGE_LIMIT)}&offset=${offset}`);
    const batch = (await res.json()) as T[];
    items.push(...batch);
    offset += batch.length;
    const total = Number(res.headers?.get('X-Total-Count'));
    const complete = Number.isFinite(total) && total > 0 && offset >= total;
    if (batch.length === 0 || res.status !== 206 || complete) break;
  }
  return items;
}

/**
 * @summary Fetches a full list from the public backend, paginating with `offset`/`limit`.
 *
 * @param {string}       path - List path, with or without a query string.
 * @param {RequestInit}  [init] - `fetch` options.
 * @returns {Promise<T[]>} All items concatenated.
 *
 * @throws {Error} HTTP 4xx/5xx on any page.
 */
export async function apiFetchPublicAll<T>(path: string, init?: RequestInit): Promise<T[]> {
  return fetchAllPages<T>(path, (p) => publicFetch(p, init));
}

/**
 * @summary Fetches a full list from the authenticated backend, paginating with `offset`/`limit`.
 *
 * @param {string}       path - List path, with or without a query string.
 * @param {RequestInit}  [init] - `fetch` options.
 * @param {string}       [bearerToken] - Explicit JWT (first-login flow).
 * @returns {Promise<T[]>} All items concatenated.
 *
 * @throws {Error} HTTP 4xx/5xx on any page.
 */
export async function apiFetchAll<T>(
  path: string,
  init?: RequestInit,
  bearerToken?: string,
): Promise<T[]> {
  return fetchAllPages<T>(path, (p) => authFetch(p, init, bearerToken));
}
