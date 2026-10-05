'use client';

import Typography from '@/components/atoms/Typography';
import {
  useCreateOfferingComment,
  useCurrentSessionQuery,
  useOfferingComments,
  useProductInventory,
} from '@/hooks/queries';
import type { ReviewCommentFormData } from '@/lib/validations/reviewComment.schema';
import type { ReviewComment } from '@/types/api';

import CommentFormArea from './CommentFormArea';
import CommentItem from './CommentItem';
import { CommentsSummary } from './CommentsSummary';

export { CommentsSummary };

const SUBMIT_ERRORS: Array<[string, string]> = [
  ['HTTP 403', 'No puedes comentar esta oferta: no se ha podido verificar una compra activa.'],
  ['HTTP 409', 'Ya has publicado un comentario para esta oferta.'],
  ['HTTP 400', 'Los datos del comentario no son válidos. Revisa la valoración y el texto.'],
];

/** Maps an API error to a readable message. */
function mapSubmitError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return (
    SUBMIT_ERRORS.find(([prefix]) => message.startsWith(prefix))?.[1] ??
    'No se pudo publicar el comentario. Inténtalo de nuevo más tarde.'
  );
}

/** Average rating and count of a list of comments. */
export function summarizeComments(comments: ReviewComment[]): { average: number; count: number } {
  const count = comments.length;
  const average = count === 0 ? 0 : comments.reduce((sum, c) => sum + c.rating, 0) / count;
  return { average, count };
}

/** Props of `OfferingComments`. */
export interface OfferingCommentsProps {
  offeringId: string;
}

/** OfferingComments - Public reviews of an offering plus the form for eligible buyers. */
export function OfferingComments({ offeringId }: Readonly<OfferingCommentsProps>) {
  const commentsQuery = useOfferingComments(offeringId);
  const sessionQuery = useCurrentSessionQuery();
  const hasSession = sessionQuery.data?.ok ?? false;
  const inventoryQuery = useProductInventory({ enabled: hasSession });
  const createComment = useCreateOfferingComment(offeringId);

  const comments = commentsQuery.data ?? [];
  const { average, count } = summarizeComments(comments);

  // Here you define your business logic (who may review: active purchase, one review per author...).
  const userId = sessionQuery.data?.userProfile?.sub;
  const alreadyCommented = !!userId && comments.some((c) => c.individualId === userId);
  const canReview = (inventoryQuery.data ?? []).some(
    (product) => product.status === 'active' && product.productOffering?.id === offeringId,
  );

  const handleSubmitComment = async (data: ReviewCommentFormData) => {
    try {
      await createComment.mutateAsync({ rating: data.rating, body: data.body || null });
    } catch (err) {
      throw new Error(mapSubmitError(err));
    }
  };

  const showList = !commentsQuery.isLoading && !commentsQuery.isError && comments.length > 0;

  return (
    <section aria-labelledby="offering-comments-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Typography as="h2" id="offering-comments-heading" variant="title">
          Comentarios y valoraciones
        </Typography>
        <CommentsSummary average={average} count={count} />
      </div>

      <CommentFormArea
        sessionLoading={sessionQuery.isLoading}
        hasSession={hasSession}
        eligibilityLoading={inventoryQuery.isLoading}
        canReview={canReview}
        alreadyCommented={alreadyCommented}
        onSubmit={handleSubmitComment}
        isPending={createComment.isPending}
      />

      {commentsQuery.isLoading && (
        <Typography variant="small" color="gray" role="status">
          Cargando comentarios…
        </Typography>
      )}

      {commentsQuery.isError && (
        <Typography variant="small" className="text-danger" role="alert">
          No se pudieron cargar los comentarios. Inténtalo de nuevo más tarde.
        </Typography>
      )}

      {showList && (
        <ul className="flex flex-col">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default OfferingComments;
