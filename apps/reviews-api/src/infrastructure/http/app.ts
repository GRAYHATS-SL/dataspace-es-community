import express from 'express';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import type { CommentsControllerDeps } from './commentsController.js';
import { createCommentsController } from './commentsController.js';
import { openapiDocument } from './openapi.js';

/**
 * Builds the `reviews-api` Express app:
 * - CRUD on `/offerings/:offeringId/comments[/:commentId]` — example resource.
 * - `GET /openapi.json` — raw OpenAPI 3.0 spec.
 * - `GET /docs` — interactive Swagger UI over that spec.
 *
 * @param deps - Use cases to inject into the comments controller.
 * @returns The Express app, ready for `app.listen(...)`.
 */
export const createApp = (deps: CommentsControllerDeps): Express => {
  const app = express();
  app.use(express.json());

  const controller = createCommentsController(deps);
  app.get('/offerings/:offeringId/comments', controller.listComments);
  app.post('/offerings/:offeringId/comments', controller.postComment);
  app.get('/offerings/:offeringId/comments/:commentId', controller.getComment);
  app.patch('/offerings/:offeringId/comments/:commentId', controller.patchComment);
  app.delete('/offerings/:offeringId/comments/:commentId', controller.deleteComment);

  app.get('/openapi.json', (_req, res) => res.json(openapiDocument));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  return app;
};
