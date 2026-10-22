import { MARKETPLACE_DID } from '@/lib/services/verifier.constants';
import type { BusinessRole, UserProfile } from '@/lib/session';

type CredentialSubject = Record<string, unknown>;
type VerifiableCredential = { credentialSubject?: CredentialSubject; [key: string]: unknown };

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** Extracts role names targeting the marketplace DID from the credential roles. */
function toItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  return raw === undefined ? [] : [raw];
}

function rolesFromItem(item: unknown): string[] {
  if (typeof item === 'string') return [item];
  if (!item || typeof item !== 'object') return [];
  const { target, names } = item as { target?: unknown; names?: unknown };
  if (target !== MARKETPLACE_DID || !Array.isArray(names)) return [];
  return names.filter((n): n is string => typeof n === 'string');
}

function extractRoles(cs: CredentialSubject): string[] {
  return toItems(cs.role ?? cs.roles).flatMap(rolesFromItem);
}

/** Maps roles to business roles: ADMIN both, SELLER provider, BUYER consumer. */
function deriveBusinessRoles(roles: string[]): BusinessRole[] {
  const upper = new Set(roles.map((r) => r.toUpperCase()));
  const result: BusinessRole[] = [];
  if (upper.has('ADMIN') || upper.has('SELLER')) result.push('proveedor');
  if (upper.has('ADMIN') || upper.has('BUYER')) result.push('consumidor');
  return result;
}

function getCredentialSubject(payload: Record<string, unknown>): CredentialSubject {
  const vcs = payload.verifiableCredential;
  // VCVerifier v2 emits `verifiableCredential` as an object; earlier versions emit it as an array.
  let vc: VerifiableCredential | null = null;
  if (Array.isArray(vcs)) vc = vcs.length > 0 ? (vcs[0] as VerifiableCredential) : null;
  else if (vcs && typeof vcs === 'object') vc = vcs as VerifiableCredential;
  return vc?.credentialSubject ?? {};
}

/** Candidate organization DIDs, in order of preference. */
export function extractOrganizationDidCandidates(payload: Record<string, unknown>): string[] {
  const cs = getCredentialSubject(payload);
  const candidates = [cs.organizationDid, cs.did, cs.id, payload.sub]
    .map(asString)
    .filter((v): v is string => !!v);
  return [...new Set(candidates)];
}

/** Extracts display profile data from a verified VCVerifier JWT payload. */
export function extractUserProfile(payload: Record<string, unknown>): UserProfile | null {
  const sub = asString(payload.sub);
  if (!sub) return null;

  const cs = getCredentialSubject(payload);

  const firstName = asString(cs.firstName) ?? asString(payload.firstName) ?? asString(cs.givenName);
  const lastName = asString(cs.lastName) ?? asString(payload.lastName) ?? asString(cs.familyName);
  const email = asString(cs.email) ?? asString(payload.email);

  const name = [firstName, lastName].filter(Boolean).join(' ') || sub;

  const organization = asString(cs.organizationName) ?? asString(cs.legalName) ?? '';

  const roles = extractRoles(cs);
  const businessRoles = deriveBusinessRoles(roles);

  const profile: UserProfile = {
    name,
    organization,
    sub,
    roles,
    businessRoles,
    email,
    firstName,
    lastName,
  };
  return profile;
}
