// Edge Runtime compatible — must NOT import Node.js modules ('crypto', 'buffer', etc.)

function decodeExp(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>;
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT has expired based on its `exp` claim.
 *
 * Does **not** verify the signature — iron-session encryption guarantees the
 * integrity of the stored token, so signature checks are redundant here.
 *
 * @param token - Raw JWT string.
 * @returns `true` if the token is expired or cannot be decoded; `false` otherwise.
 */
export function isJWTExpired(token: string): boolean {
  const exp = decodeExp(token);
  if (exp === null) return true;
  return Math.floor(Date.now() / 1000) >= exp;
}

/**
 * Extracts the `exp` claim (seconds since Unix epoch) from a JWT.
 *
 * @param token - Raw JWT string.
 * @returns The expiry timestamp in seconds, or `null` if the token is malformed
 *   or the `exp` claim is absent.
 */
export function getJWTExp(token: string): number | null {
  return decodeExp(token);
}
