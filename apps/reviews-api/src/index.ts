/** Entry point of `reviews-api` — wires domain/application/infrastructure and starts the Express server. */
import { createCommentUseCase } from './application/createComment.js';
import { deleteCommentUseCase } from './application/deleteComment.js';
import { getCommentUseCase } from './application/getComment.js';
import { listCommentsByOfferingUseCase } from './application/listCommentsByOffering.js';
import { updateCommentUseCase } from './application/updateComment.js';
import { db } from './infrastructure/db/client.js';
import { createApp } from './infrastructure/http/app.js';
import { createPgCommentRepository } from './infrastructure/PgCommentRepository.js';

const repository = createPgCommentRepository(db);
const app = createApp({
  createComment: createCommentUseCase(repository),
  listCommentsByOffering: listCommentsByOfferingUseCase(repository),
  getComment: getCommentUseCase(repository),
  updateComment: updateCommentUseCase(repository),
  deleteComment: deleteCommentUseCase(repository),
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`reviews-api listening on port ${PORT}`);
});
