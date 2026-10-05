import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import {
  getOidcConfiguration,
  getRedirectUri,
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
} from '@/lib/services/oidc';
import {
  createAuthenticatedSession,
  getPendingOAuthSession,
  isSessionConfigured,
  UserProfile,
} from '@/lib/session';
import { trackError, trackEvent } from '@/lib/utils/sentry';
import { decodeJWTPayload } from '@/lib/utils/verifyJWT';

interface TokenResponse {
  access_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
}

/** Constant-time string comparison (avoids timing attacks on state/nonce). */
const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Maps the verified token claims to the session profile (standard OIDC claims only).
 */
const buildUserProfile = (payload: Record<string, unknown>): UserProfile => {
  const sub = String(payload.sub);
  const name = typeof payload.name === 'string' ? payload.name : sub;
  const email = typeof payload.email === 'string' ? payload.email : undefined;

  // Here you define your business logic (custom claims, roles...).
  // Here you resolve the user's TMF Party ids (e.g. look up the Organization/Individual
  // matching the token claims) and set `organizationId` / `individualId`.
  const organizationId: string | undefined = undefined;
  const individualId: string | undefined = undefined;

  return { sub, name, email, organizationId, individualId };
};

type TokenExchangeResult = TokenResponse | { error: 'idp_unavailable' | 'token_exchange_failed' };

/** Exchanges the authorization code for tokens at the IdP token endpoint (PKCE). */
async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenExchangeResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (OIDC_CLIENT_SECRET) {
    const credentials = Buffer.from(`${OIDC_CLIENT_ID}:${OIDC_CLIENT_SECRET}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  let tokenResponse: Response;
  try {
    const { token_endpoint } = await getOidcConfiguration();
    tokenResponse = await fetch(token_endpoint, {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        client_id: OIDC_CLIENT_ID,
        code_verifier: codeVerifier,
      }),
      cache: 'no-store',
    });
  } catch (error) {
    trackError(error, { reason: 'idp_unavailable' });
    return { error: 'idp_unavailable' };
  }

  if (!tokenResponse.ok) {
    trackError(new Error('Token exchange failed'), {
      reason: 'token_exchange_failed',
      status: tokenResponse.status,
    });
    return { error: 'token_exchange_failed' };
  }

  return (await tokenResponse.json()) as TokenResponse;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const stateParam = searchParams.get('state');
  const code = searchParams.get('code');

  // Use the public app URL for redirects: req.url may hold an internal host behind a proxy.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

  if (!(await isSessionConfigured()) || !OIDC_CLIENT_ID) {
    return NextResponse.redirect(new URL('/inicio-sesion?error=not_configured', appUrl));
  }

  if (!stateParam || !code) {
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_request', appUrl));
  }

  // --- Validate state against the pending cookie (CSRF protection) ---
  const pendingSession = await getPendingOAuthSession();
  const storedState = pendingSession.state;
  const storedNonce = pendingSession.nonce;
  const codeVerifier = pendingSession.codeVerifier;

  if (!storedState || !storedNonce || !codeVerifier) {
    trackError(new Error('OAuth state cookie missing'), { reason: 'invalid_state' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_state', appUrl));
  }

  if (!safeEqual(stateParam, storedState)) {
    trackError(new Error('OAuth state mismatch'), { reason: 'invalid_state' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_state', appUrl));
  }

  // Invalidate the pending cookie (one-time use)
  pendingSession.destroy();

  // --- Exchange the authorization code for tokens ---
  const exchange = await exchangeCodeForTokens(code, codeVerifier);
  if ('error' in exchange) {
    return NextResponse.redirect(new URL(`/inicio-sesion?error=${exchange.error}`, appUrl));
  }
  const tokenData = exchange;
  const { access_token, id_token, expires_in } = tokenData;

  if (!access_token || !id_token) {
    trackError(new Error('Tokens missing in token response'), { reason: 'token_missing' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=token_missing', appUrl));
  }

  // --- Verify the id_token (signature via JWKS, exp, iss, aud = client id, sub) ---
  // The access_token is not validated here: its audience is the resource server (TM Forum API).
  const { valid, payload } = await decodeJWTPayload(id_token, OIDC_CLIENT_ID);
  if (!valid) {
    trackError(new Error('JWT validation failed'), { reason: 'jwt_verification_failed' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_token', appUrl));
  }

  // --- Validate nonce (replay protection) ---
  if (typeof payload.nonce !== 'string' || !safeEqual(payload.nonce, storedNonce)) {
    trackError(new Error('OIDC nonce mismatch'), { reason: 'invalid_nonce' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_token', appUrl));
  }

  // --- Save access_token (Bearer for the TM Forum API) and profile in the session ---
  const userProfile = buildUserProfile(payload);

  // Here you define your business logic (party/organization lookup, onboarding redirects...).

  await createAuthenticatedSession(access_token, userProfile, expires_in);
  trackEvent('auth', 'login_success');

  return NextResponse.redirect(new URL('/dashboard', appUrl));
}
