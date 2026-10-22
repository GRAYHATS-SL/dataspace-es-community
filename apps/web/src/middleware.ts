import { getIronSession, SessionOptions } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';

import type { SessionData } from '@/lib/session';
import { isJWTExpired } from '@/lib/utils/jwtEdge';

if (!process.env.SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET no está definida. Configura esta variable de entorno antes de iniciar la aplicación.',
  );
}

const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'ds-session',
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

function redirectToLogin(req: NextRequest, reason: 'unauthenticated' | 'expired') {
  const url = new URL('/inicio-sesion', req.url);
  if (reason === 'expired') url.searchParams.set('error', 'session_expired');
  const res = NextResponse.redirect(url);
  if (reason === 'expired') res.cookies.delete('ds-session');
  return res;
}

export async function middleware(req: NextRequest) {
  const session = await getIronSession<SessionData>(req.cookies as never, SESSION_OPTIONS);

  if (!session.accessToken) {
    return redirectToLogin(req, 'unauthenticated');
  }

  if (isJWTExpired(session.accessToken)) {
    return redirectToLogin(req, 'expired');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/perfil', '/perfil/:path*', '/catalogo/:path+'],
};
