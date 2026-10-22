'use server';

import { getSession } from '@/lib/session';

/**
 * @summary Destroys the authenticated user's iron-session.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Desde un botón de logout en el cliente
 * await logout();
 * window.location.href = '/inicio-sesion';
 */
export async function logout() {
  const session = await getSession();
  session.destroy();
}
