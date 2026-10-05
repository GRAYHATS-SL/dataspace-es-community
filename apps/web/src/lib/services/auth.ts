'use server';

import crypto from 'node:crypto';

import { redirect } from 'next/navigation';

import {
  getOidcConfiguration,
  getRedirectUri,
  OIDC_CLIENT_ID,
  OIDC_SCOPE,
} from '@/lib/services/oidc';
import { getPendingOAuthSession, getSession, isSessionConfigured } from '@/lib/session';

/**
 * Starts the OIDC Authorization Code flow (with PKCE).
 *
 * Generates `state`, `nonce` and a PKCE verifier, stores them in the short-lived pending cookie
 * and redirects the browser to the identity provider's authorize endpoint.
 */
export async function startLogin(): Promise<never> {
  if (!(await isSessionConfigured()) || !OIDC_CLIENT_ID) {
    redirect('/inicio-sesion?error=not_configured');
  }

  // `redirect()` throws internally, so it must stay outside the try/catch.
  let authorizationEndpoint: string | null = null;
  try {
    ({ authorization_endpoint: authorizationEndpoint } = await getOidcConfiguration());
  } catch {
    authorizationEndpoint = null;
  }
  if (!authorizationEndpoint) {
    redirect('/inicio-sesion?error=idp_unavailable');
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // One-time cookie: it is cleared after validation in the callback.
  const pendingSession = await getPendingOAuthSession();
  pendingSession.state = state;
  pendingSession.nonce = nonce;
  pendingSession.codeVerifier = codeVerifier;
  await pendingSession.save();

  const url = new URL(authorizationEndpoint);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', OIDC_CLIENT_ID);
  url.searchParams.set('redirect_uri', getRedirectUri());
  url.searchParams.set('scope', OIDC_SCOPE);
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  redirect(url.toString());
}

/**
 * Destroys the user's encrypted session cookie.
 * The client performs the post-logout redirect with a full page load.
 *
 * @example
 * await logout();
 * window.location.href = '/inicio-sesion';
 */
export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  // Here you define your logout rules (e.g. redirect to the IdP end_session_endpoint).
}
