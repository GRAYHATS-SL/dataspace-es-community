const HEAD_CHARS = 12;
const TAIL_CHARS = 6;

/**
 * @summary Truncates a long DID for UI display.
 *
 * @param  {string}  did - Full DID.
 * @returns {string} Truncated DID, or the original if already short.
 *
 * @example
 * formatDid('did:key:zDnaeeSSTVqDMufcjnCztF7iMYALxkCFaR7T34Vc3kfexQoGX')
 * // 'did:key:zDna…exQoGX'
 *
 * @example
 * formatDid('did:web:marketplace.example.org')
 * // 'did:web:marketplace.example.org'
 */
export function formatDid(did: string): string {
  // did:web:<domain> is readable and the domain is what matters: it is not truncated.
  if (did.startsWith('did:web:')) return did;
  if (did.length <= HEAD_CHARS + TAIL_CHARS + 1) return did;
  return `${did.slice(0, HEAD_CHARS)}…${did.slice(-TAIL_CHARS)}`;
}
