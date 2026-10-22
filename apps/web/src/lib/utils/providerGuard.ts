import { redirect } from 'next/navigation';

import { getSession } from '@/lib/session';

/**
 * @summary Redirects to `/dashboard` anyone without the `proveedor` business role.
 *
 * @throws {Error} `NEXT_REDIRECT` when the user is not a provider.
 */
export async function redirectUnlessProvider(): Promise<void> {
  const { userProfile } = await getSession();
  const businessRoles = userProfile?.businessRoles ?? ['proveedor', 'consumidor'];
  if (!businessRoles.includes('proveedor')) redirect('/dashboard');
}
