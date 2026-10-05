import { NextResponse } from 'next/server';

import { getValidSession } from '@/lib/session';

export async function GET(): Promise<NextResponse> {
  const session = await getValidSession();
  if (!session.accessToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    userProfile: session.userProfile ?? null,
    expiresAt: session.expiresAt ?? null,
  });
}
