import { NextResponse } from 'next/server';

import { getValidSession } from '@/lib/session';
import { getJWTExp } from '@/lib/utils/jwtEdge';

export async function GET() {
  const session = await getValidSession();
  if (!session.accessToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const exp = getJWTExp(session.accessToken);
  return NextResponse.json({
    ok: true,
    userProfile: session.userProfile ?? null,
    expiresAt: exp === null ? null : exp * 1000,
  });
}
