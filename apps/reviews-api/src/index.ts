/** Entry point of `reviews-api`. */
import { createCommentUseCase } from './application/createComment.js';
import { listCommentsByOfferingUseCase } from './application/listCommentsByOffering.js';
import { db } from './infrastructure/db/client.js';
import { createApp } from './infrastructure/http/app.js';
import { createPgCommentRepository } from './infrastructure/PgCommentRepository.js';

const repository = createPgCommentRepository(db);
const app = createApp({
  createComment: createCommentUseCase(repository),
  listCommentsByOffering: listCommentsByOfferingUseCase(repository),
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`reviews-api escuchando en el puerto ${PORT}`);
});
