import type { Request, Response } from 'express';

import type { CreateCommentError, CreateCommentInput } from '@application/createComment.js';
import type { DeleteCommentError } from '@application/deleteComment.js';
import type { GetCommentError } from '@application/getComment.js';
import type { UpdateCommentError, UpdateCommentInput } from '@application/updateComment.js';
import type { Comment } from '@domain/Comment.js';
import type { Result } from '@domain/Result.js';
import { verifyInternalToken } from '@infrastructure/internalToken.js';

/** Use cases required by the controller — injected from `src/index.ts`. */
export interface CommentsControllerDeps {
  createComment: (input: CreateCommentInput) => Promise<Result<Comment, CreateCommentError>>;
  listCommentsByOffering: (offeringId: string) => Promise<Comment[]>;
  getComment: (offeringId: string, commentId: string) => Promise<Result<Comment, GetCommentError>>;
  updateComment: (input: UpdateCommentInput) => Promise<Result<Comment, UpdateCommentError>>;
  deleteComment: (offeringId: string, commentId: string) => Promise<Result<void, DeleteCommentError>>;
}

/** Every error code the use cases can return. */
type CommentError = CreateCommentError | UpdateCommentError | GetCommentError | DeleteCommentError;

/** HTTP status for each {@link CommentError}. */
const ERROR_STATUS: Record<CommentError, number> = {
  invalid_rating: 400,
  body_too_long: 400,
  not_found: 404,
};

/** Human-readable message for each {@link CommentError}. */
const ERROR_MESSAGE: Record<CommentError, string> = {
  invalid_rating: 'rating must be an integer between 1 and 5',
  body_too_long: 'body must not exceed 1000 characters',
  not_found: 'Comment not found',
};

/**
 * Sends the JSON error response matching a use case error.
 *
 * @param res - Express response.
 * @param error - Use case error code.
 */
const sendError = (res: Response, error: CommentError): void => {
  const status = ERROR_STATUS[error];
  res.status(status).json({ error: ERROR_MESSAGE[error], status });
};

/**
 * Extracts a route parameter, guaranteeing it is a string
 * (Express 5 types it as `string | string[] | undefined`).
 *
 * @param req - Express request.
 * @param name - Route parameter name.
 * @returns The parameter value.
 * @throws {TypeError} If the parameter is not a string (should not happen with the registered routes).
 */
const getParam = (req: Request, name: 'offeringId' | 'commentId'): string => {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new TypeError(`Route parameter ${name} is not a string`);
  }
  return value;
};

/**
 * Verifies the internal token of a write request. Sends a 403 response when it is
 * missing, malformed, expired or rejected by the authorization rules.
 *
 * @param req - Express request.
 * @param res - Express response.
 * @param offeringId - `offeringId` of the route.
 * @returns `true` if the request may proceed.
 */
const authorize = (req: Request, res: Response, offeringId: string): boolean => {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(403).json({ error: 'Missing or malformed internal token', status: 403 });
    return false;
  }

  const tokenResult = verifyInternalToken(token, offeringId);
  if (!tokenResult.ok) {
    res.status(403).json({ error: 'Invalid or expired internal token', status: 403 });
    return false;
  }

  // Here you define your authorization rules (e.g. using tokenResult.value.sub).
  return true;
};

/**
 * Maps a raw JSON `rating` to the use case input: non-numbers become `NaN` so the
 * use case rejects them.
 */
const toRating = (rating: unknown): number => (typeof rating === 'number' ? rating : Number.NaN);

/**
 * Builds the Express handlers for `/offerings/:offeringId/comments[/:commentId]`.
 *
 * @param deps - Comment use cases.
 * @returns One handler per endpoint, ready to be registered as routes.
 */
export const createCommentsController = (deps: CommentsControllerDeps) => {
  /**
   * `GET /offerings/:offeringId/comments` — public read, no authentication.
   *
   * @returns 200 with `Comment[]`.
   */
  const listComments = async (req: Request, res: Response): Promise<void> => {
    const comments = await deps.listCommentsByOffering(getParam(req, 'offeringId'));
    res.status(200).json(comments);
  };

  /**
   * `POST /offerings/:offeringId/comments` — verifies the internal token and creates the comment.
   *
   * @returns 201 with the created comment; 403 on an invalid token; 400 on an invalid payload.
   */
  const postComment = async (req: Request, res: Response): Promise<void> => {
    const offeringId = getParam(req, 'offeringId');
    if (!authorize(req, res, offeringId)) return;

    const { rating, body } = (req.body ?? {}) as { rating?: unknown; body?: unknown };

    const result = await deps.createComment({
      offeringId,
      rating: toRating(rating),
      body: typeof body === 'string' ? body : null,
    });

    if (!result.ok) return sendError(res, result.error);
    res.status(201).json(result.value);
  };

  /**
   * `GET /offerings/:offeringId/comments/:commentId` — public read, no authentication.
   *
   * @returns 200 with the comment; 404 if it does not exist.
   */
  const getComment = async (req: Request, res: Response): Promise<void> => {
    const result = await deps.getComment(getParam(req, 'offeringId'), getParam(req, 'commentId'));
    if (!result.ok) return sendError(res, result.error);
    res.status(200).json(result.value);
  };

  /**
   * `PATCH /offerings/:offeringId/comments/:commentId` — verifies the internal token and
   * partially updates the comment.
   *
   * @returns 200 with the updated comment; 403 on an invalid token; 400 on an invalid payload; 404.
   */
  const patchComment = async (req: Request, res: Response): Promise<void> => {
    const offeringId = getParam(req, 'offeringId');
    if (!authorize(req, res, offeringId)) return;

    const { rating, body } = (req.body ?? {}) as { rating?: unknown; body?: unknown };

    const result = await deps.updateComment({
      offeringId,
      commentId: getParam(req, 'commentId'),
      ...(rating !== undefined && { rating: toRating(rating) }),
      ...(body !== undefined && { body: typeof body === 'string' ? body : null }),
    });

    if (!result.ok) return sendError(res, result.error);
    res.status(200).json(result.value);
  };

  /**
   * `DELETE /offerings/:offeringId/comments/:commentId` — verifies the internal token and
   * deletes the comment.
   *
   * @returns 204 on success; 403 on an invalid token; 404 if it does not exist.
   */
  const deleteComment = async (req: Request, res: Response): Promise<void> => {
    const offeringId = getParam(req, 'offeringId');
    if (!authorize(req, res, offeringId)) return;

    const result = await deps.deleteComment(offeringId, getParam(req, 'commentId'));
    if (!result.ok) return sendError(res, result.error);
    res.status(204).end();
  };

  return { listComments, postComment, getComment, patchComment, deleteComment };
};
