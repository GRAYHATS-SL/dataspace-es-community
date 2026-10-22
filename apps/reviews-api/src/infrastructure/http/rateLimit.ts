import type { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 10_000;

/**
 * In-memory fixed-window rate limiter per client IP.
 *
 * @param limit - Requests allowed per window.
 * @param windowMs - Window duration in milliseconds.
 * @returns Express middleware.
 */
export const createRateLimiter = (limit: number, windowMs: number) => {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (buckets.size >= MAX_BUCKETS) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    }

    const key = req.ip ?? 'unknown';
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > limit) {
      res.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Demasiadas peticiones', status: 429 });
      return;
    }
    next();
  };
};
