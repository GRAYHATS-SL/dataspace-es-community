import express from 'express';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import { auditLog } from './auditLog.js';
import type { CommentsControllerDeps } from './commentsController.js';
import { createCommentsController } from './commentsController.js';
import { openapiDocument } from './openapi.js';
import { createRateLimiter } from './rateLimit.js';

/** Rate limiter window, in milliseconds. */
const RATE_LIMIT_WINDOW_MS = 60_000;
/** Writes (`POST`) allowed per IP and window. */
const WRITE_RATE_LIMIT = 20;
/** Reads (`GET`) allowed per IP and window. */
const READ_RATE_LIMIT = 120;

/**
 * Builds the `reviews-api` Express app.
 *
 * @param deps - Use cases for the comments controller.
 * @returns The Express app.
 */
export const createApp = (deps: CommentsControllerDeps): Express => {
  const app = express();

  const trustProxyHops = Number(process.env.TRUST_PROXY);
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.use(auditLog);
  app.use(express.json());

  const controller = createCommentsController(deps);
  app.post(
    '/offerings/:offeringId/comments',
    createRateLimiter(WRITE_RATE_LIMIT, RATE_LIMIT_WINDOW_MS),
    controller.postComment,
  );
  app.get(
    '/offerings/:offeringId/comments',
    createRateLimiter(READ_RATE_LIMIT, RATE_LIMIT_WINDOW_MS),
    controller.getComments,
  );

  if (process.env.ENABLE_API_DOCS === 'true') {
    app.get('/openapi.json', (_req, res) => res.json(openapiDocument));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));
  }

  return app;
};
