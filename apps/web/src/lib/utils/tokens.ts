'use server';
import crypto from 'node:crypto';

/**
 * Generates an HMAC SHA-256 signed token.
 *
 * @param {string} userId - User ID.
 * @returns {Promise<string>} Signed token.
 * @throws {Error} If `TOKEN_SECRET` is not set.
 */
export async function generateToken(userId: string): Promise<string> {
  const SECRET = process.env.TOKEN_SECRET;
  if (!SECRET) {
    throw new Error('No se ha definido TOKEN_SECRET');
  }

  const timestamp = Date.now();
  const data = `${userId}.${timestamp}`;

  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');

  return `${data}.${signature}`;
}

/**
 * Verifies a signed token.
 *
 * @param {string} token - Signed token to verify.
 * @returns {Promise<boolean>} `true` if valid, `false` otherwise.
 */
export async function verifySignedToken(token: string): Promise<boolean> {
  const SECRET = process.env.TOKEN_SECRET;
  if (!SECRET) {
    console.error('No se ha definido TOKEN_SECRET');
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [userId, timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);
  if (Number.isNaN(timestamp)) return false;

  // ✅ 7-day expiration
  const sevenDays = 7 * 24 * 60 * 60 * 1000; // ms
  if (Date.now() - timestamp > sevenDays) return false;

  // Generate HMAC SHA-256
  const data = `${userId}.${timestamp}`;
  const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('hex');

  if (signature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
