'use server';

import crypto from 'node:crypto';

import { headers } from 'next/headers';

import {
  CLIENT_ID,
  VERIFIER_LOGIN_QR_URL,
  VERIFIER_SCOPE,
} from '@/lib/services/verifier.constants';
import { getPendingOAuthSession } from '@/lib/session';
import { checkRateLimit, getClientIp } from '@/lib/utils/rateLimit';

/**
 * @summary Result of the QR request to the VCVerifier.
 */
export interface QRServiceResult {
  qrImageSrc: string | null;
  ok: boolean;
  status: number;
  state: string;
}

/** The verifier replies with an embedded `<img>` in HTML. */
function extractBase64ImageSrc(html: string): string | null {
  // The verifier may emit "data:data:image/..." (double prefix) and HTML entities like &#43; (="+")
  const match = /src="(data:(?:data:)?image\/[^;]+;base64,[^"]+)"/.exec(html);
  if (!match?.[1]) return null;

  return match[1]
    .replaceAll('&#43;', '+')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#61;', '=');
}

/**
 * @summary Requests a login QR code from the VCVerifier and starts the OIDC flow.
 *
 * @param {string}  redirectUri - OAuth redirect URI registered in the VCVerifier.
 * @returns {Promise<QRServiceResult>} QR image in base64, operation status and the CSRF `state`.
 *
 * @throws {Error} If the network call or pending-session persistence fails.
 *
 * @example
 * const { qrImageSrc, ok, state } = await fetchVerifierQR('https://app.example.com/auth/callback');
 * if (ok) {
 *   // Mostrar <img src={qrImageSrc} /> al usuario
 * }
 */
export async function fetchVerifierQR(redirectUri: string): Promise<QRServiceResult> {
  // Same source as the exchange in the callback: redirect_uri must be identical in both steps.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const effectiveRedirectUri = appUrl ? `${appUrl}/auth/callback` : redirectUri;

  const state = crypto.randomUUID();

  const limit = checkRateLimit(`login-qr:${getClientIp(await headers())}`, 30, 60_000);
  if (!limit.allowed) return { qrImageSrc: null, ok: false, status: 429, state };

  // Persist state in an httpOnly cookie to validate it in the callback (CSRF protection).
  const pendingSession = await getPendingOAuthSession();
  pendingSession.state = state;
  // The pending cookie is single-use: it is deleted after validating it in the callback.
  await pendingSession.save();

  const url = new URL(VERIFIER_LOGIN_QR_URL);
  url.searchParams.set('state', state);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', effectiveRedirectUri);
  url.searchParams.set('scope', VERIFIER_SCOPE);

  // Do not cache the QR response: each request must generate a new unique code.
  const response = await fetch(url.toString(), { cache: 'no-store' });

  const contentType = response.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('text/html');
  const html = isHtml ? await response.text() : '';
  const qrImageSrc = isHtml ? extractBase64ImageSrc(html) : null;

  return { qrImageSrc, ok: response.ok && qrImageSrc !== null, status: response.status, state };
}
