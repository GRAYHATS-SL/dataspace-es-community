import { getIronSession, SessionOptions } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';

import type { SessionData } from '@/lib/session';

const SESSION_SECRET = process.env.SESSION_SECRET ?? '';
// Same rule as lib/session.ts: without a valid secret, sessions are disabled.
const SESSION_CONFIGURED = SESSION_SECRET.length >= 32;

const SESSION_COOKIE_NAME = 'app-session';

const SESSION_OPTIONS: SessionOptions = {
  cookieName: SESSION_COOKIE_NAME,
  password: SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

type RedirectReason = 'unauthenticated' | 'expired' | 'not_configured';

function redirectToLogin(req: NextRequest, reason: RedirectReason): NextResponse {
  const url = new URL('/inicio-sesion', req.url);
  if (reason === 'expired') url.searchParams.set('error', 'session_expired');
  if (reason === 'not_configured') url.searchParams.set('error', 'not_configured');
  const res = NextResponse.redirect(url);
  if (reason === 'expired') res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  if (!SESSION_CONFIGURED) {
    return redirectToLogin(req, 'not_configured');
  }

  const session = await getIronSession<SessionData>(req.cookies as never, SESSION_OPTIONS);

  if (!session.accessToken) {
    return redirectToLogin(req, 'unauthenticated');
  }

  if (session.expiresAt && Date.now() >= session.expiresAt) {
    return redirectToLogin(req, 'expired');
  }

  // Here you define your authorization rules (roles, onboarding status, etc.).

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/perfil', '/perfil/:path*', '/catalogo/:path+'],
};
