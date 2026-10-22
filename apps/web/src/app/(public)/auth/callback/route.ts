import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { findOrganizationByDids } from '@/lib/services/queries/party';
import { CLIENT_ID, VERIFIER_TOKEN_URL } from '@/lib/services/verifier.constants';
import { createAuthenticatedSession, getPendingOAuthSession } from '@/lib/session';
import { extractOrganizationDidCandidates, extractUserProfile } from '@/lib/utils/extractUserProfile';
import { isOrganizationActive } from '@/lib/utils/organizationStatus';
import { checkRateLimit, getClientIp } from '@/lib/utils/rateLimit';
import { trackError, trackEvent } from '@/lib/utils/sentry';
import { decodeJWTPayload } from '@/lib/utils/verifyJWT';

const enrichUserProfile = async (
  userProfile: ReturnType<typeof extractUserProfile>,
  didCandidates: string[],
  accessToken: string,
): Promise<'closed' | void> => {
  if (!userProfile) return;
  try {
    const organization = await findOrganizationByDids(didCandidates, accessToken);
    if (!organization) {
      trackEvent('auth', 'org_lookup_no_match', { sub: userProfile.sub });
      return;
    }
    // Deactivated organization: its people cannot sign in.
    if (!isOrganizationActive(organization)) {
      trackEvent('auth', 'login_blocked_org_closed', { sub: userProfile.sub });
      return 'closed';
    }
    userProfile.organizationId = organization.id;
    // Name in TMF: copied to `relatedParty.name` of what the provider creates (public views).
    userProfile.organizationName = organization.tradingName ?? organization.name;
  } catch (err) {
    // Sentry is not initialized in development: without this the lookup failure goes unnoticed.
    console.error('[auth/callback] org_lookup_failed', userProfile.sub, err);
    trackError(err, { reason: 'org_lookup_failed', sub: userProfile.sub });
  }
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stateParam = searchParams.get('state');
  const code = searchParams.get('code');

  // req.url may contain the internal host (localhost:3000) behind a reverse proxy. Use NEXT_PUBLIC_APP_URL for redirects and the token exchange redirect_uri.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL no definida' }, { status: 500 });
  }

  const limit = checkRateLimit(`auth-callback:${getClientIp(req.headers)}`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.redirect(new URL('/inicio-sesion?error=rate_limited', appUrl));
  }

  if (!stateParam || !code) {
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_request', appUrl));
  }

  // --- Validate state against the ds-oauth-pending cookie (CSRF protection) ---
  const pendingSession = await getPendingOAuthSession();
  const storedState = pendingSession.state;

  if (!storedState) {
    trackError(new Error('OAuth state cookie missing'), { reason: 'invalid_state' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_state', appUrl));
  }

  const stateParamBuf = Buffer.from(stateParam);
  const storedStateBuf = Buffer.from(storedState);
  const statesMatch =
    stateParamBuf.length === storedStateBuf.length &&
    crypto.timingSafeEqual(stateParamBuf, storedStateBuf);

  if (!statesMatch) {
    trackError(new Error('OAuth state mismatch'), { reason: 'invalid_state' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_state', appUrl));
  }

  // Invalidate the pending cookie (one-time use)
  pendingSession.state = undefined;
  await pendingSession.save();

  // --- Exchange code for token ---
  const tokenResponse = await fetch(VERIFIER_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/auth/callback`,
      client_id: CLIENT_ID, // not in the exchange doc; the v2 verifier tolerates it (real login validated)
    }),
  });

  if (!tokenResponse.ok) {
    trackError(new Error('Token exchange failed'), {
      reason: 'token_exchange_failed',
      status: tokenResponse.status,
    });
    return NextResponse.redirect(new URL('/inicio-sesion?error=token_exchange_failed', appUrl));
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  const access_token = tokenData.access_token;

  if (!access_token) {
    trackError(new Error('Access token missing in verifier response'), { reason: 'token_missing' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=token_missing', appUrl));
  }

  // aud may be a string or an array containing the verifier's client_id (`tmf-api`)
  const { valid, payload } = await decodeJWTPayload(access_token, CLIENT_ID);

  if (!valid) {
    trackError(new Error('JWT validation failed'), { reason: 'jwt_verification_failed' });
    return NextResponse.redirect(new URL('/inicio-sesion?error=invalid_token', appUrl));
  }

  // --- Save token and profile in authenticated session --- The cookie TTL is aligned with the JWT `exp` (see createAuthenticatedSession) so that session and token expire simultaneously — there is no refresh token.
  const userProfile = extractUserProfile(payload);

  // --- TMForum flow: find/create Individual and associate to Organization ---
  const enrichResult = await enrichUserProfile(
    userProfile,
    extractOrganizationDidCandidates(payload),
    access_token,
  );
  if (enrichResult === 'closed') {
    return NextResponse.redirect(new URL('/inicio-sesion?error=org_closed', appUrl));
  }

  await createAuthenticatedSession(access_token, userProfile);
  trackEvent('auth', 'login_success', { hasOrg: !!userProfile?.organizationId });

  return NextResponse.redirect(new URL('/dashboard', appUrl));
}
