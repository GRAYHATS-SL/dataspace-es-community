import type { Request, Response } from 'express';

import type { CreateCommentError, CreateCommentInput } from '@application/createComment.js';
import type { Comment } from '@domain/Comment.js';
import type { CommentsWithAverage } from '@domain/CommentRepository.js';
import type { Result } from '@domain/Result.js';
import { verifyInternalToken } from '@infrastructure/internalToken.js';

import { AUDIT_ACTOR_KEY, hashActor } from './auditLog.js';

/** Use cases the controller needs. */
export interface CommentsControllerDeps {
  createComment: (input: CreateCommentInput) => Promise<Result<Comment, CreateCommentError>>;
  listCommentsByOffering: (offeringId: string) => Promise<CommentsWithAverage>;
}

/** HTTP status code for each {@link CreateCommentError}. */
const ERROR_STATUS: Record<CreateCommentError, number> = {
  invalid_rating: 400,
  body_too_long: 400,
  duplicate: 409,
};

/** Error message for each {@link CreateCommentError}. */
const ERROR_MESSAGE: Record<CreateCommentError, string> = {
  invalid_rating: 'rating debe ser un entero entre 1 y 5',
  body_too_long: 'body no puede superar 1000 caracteres',
  duplicate: 'Ya existe un comentario de esta organización para esta oferta',
};

/**
 * Extracts `offeringId` from the route params.
 *
 * @param req - Express request.
 * @returns The route `offeringId`.
 * @throws {TypeError} If `offeringId` is not a string.
 */
const getOfferingId = (req: Request): string => {
  const { offeringId } = req.params;
  if (typeof offeringId !== 'string') {
    throw new TypeError('offeringId de la ruta no es una cadena');
  }
  return offeringId;
};

/**
 * Builds the Express handlers for `/offerings/:offeringId/comments`.
 *
 * @param deps - Comment use cases.
 * @returns `{ postComment, getComments }`.
 */
export const createCommentsController = (deps: CommentsControllerDeps) => {
  /**
   * `POST /offerings/:offeringId/comments` — creates a comment.
   *
   * @returns 201 with the created comment, or an error status.
   */
  const postComment = async (req: Request, res: Response): Promise<void> => {
    const offeringId = getOfferingId(req);
    const [scheme, token] = (req.header('authorization') ?? '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.status(403).json({ error: 'Token interno ausente o mal formado', status: 403 });
      return;
    }

    const tokenResult = verifyInternalToken(token, offeringId);
    if (!tokenResult.ok) {
      res.status(403).json({ error: 'Token interno inválido o expirado', status: 403 });
      return;
    }

    res.locals[AUDIT_ACTOR_KEY] = hashActor(tokenResult.value.organizationId);

    const { rating, body } = (req.body ?? {}) as { rating?: unknown; body?: unknown };

    const result = await deps.createComment({
      offeringId,
      organizationId: tokenResult.value.organizationId,
      individualId: tokenResult.value.individualId,
      rating: typeof rating === 'number' ? rating : Number.NaN,
      body: typeof body === 'string' ? body : null,
    });

    if (!result.ok) {
      const status = ERROR_STATUS[result.error];
      res.status(status).json({ error: ERROR_MESSAGE[result.error], status });
      return;
    }

    res.status(201).json(result.value);
  };

  /**
   * `GET /offerings/:offeringId/comments` — public read.
   *
   * @returns 200 with `{ comments, average, count }`.
   */
  const getComments = async (req: Request, res: Response): Promise<void> => {
    const offeringId = getOfferingId(req);
    const result = await deps.listCommentsByOffering(offeringId);
    res.status(200).json(result);
  };

  return { postComment, getComments };
};
