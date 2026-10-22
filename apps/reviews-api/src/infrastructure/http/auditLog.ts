import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

/** `res.locals` key holding the authenticated actor. */
export const AUDIT_ACTOR_KEY = 'auditActor';

/**
 * Pseudonymizes an identifier for the audit log.
 *
 * @param value - Identifier to pseudonymize.
 * @returns The first 16 hex characters of the hash.
 */
export const hashActor = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);

/**
 * Access audit log middleware.
 *
 * @returns Express middleware.
 */
export const auditLog = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const actor: unknown = res.locals[AUDIT_ACTOR_KEY];
    // In Express 5 `req.params` may be undefined if no route matched (404).
    const offeringId: unknown = (req.params as Record<string, unknown> | undefined)?.offeringId;
    console.log(
      JSON.stringify({
        event: 'http_access',
        requestId,
        method: req.method,
        route: req.baseUrl + (req.route ? String(req.route.path) : req.path),
        offeringId: typeof offeringId === 'string' ? offeringId : undefined,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
        actor: typeof actor === 'string' ? actor : undefined,
      }),
    );
  });

  next();
};
