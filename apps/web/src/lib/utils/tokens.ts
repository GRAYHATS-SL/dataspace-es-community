'use server';

import crypto from 'node:crypto';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string | undefined {
  return process.env.ONBOARDING_TOKEN_SECRET || undefined;
}

/** Returns whether signed onboarding links can be generated and verified. */
export async function isOnboardingTokenConfigured(): Promise<boolean> {
  return Boolean(getSecret());
}

/** Generates an HMAC-SHA256 signed token with the format `subject.timestamp.signature`. */
export async function generateToken(subject: string): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('ONBOARDING_TOKEN_SECRET is not configured.');

  const data = `${subject}.${Date.now()}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${data}.${signature}`;
}

/** Verifies the signature and expiry of a token created by `generateToken`. */
export async function verifySignedToken(token: string): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [subject, timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);
  if (Number.isNaN(timestamp)) return false;

  // Here you define your business logic (token lifetime, single-use tokens...).
  if (Date.now() - timestamp > TOKEN_TTL_MS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${subject}.${timestamp}`)
    .digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
