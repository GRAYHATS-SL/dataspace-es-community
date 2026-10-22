'use client';

import Typography from '@/components/atoms/Typography';
import {
  useCreateOfferingComment,
  useCurrentSessionQuery,
  useOfferingComments,
  useProductInventoriesAsBuyer,
} from '@/hooks/queries';
import type { ReviewCommentFormData } from '@/lib/validations/reviewComment.schema';

import CommentFormArea from './CommentFormArea';
import CommentItem from './CommentItem';
import { CommentsSummary } from './CommentsSummary';

export { CommentsSummary };

function mapSubmitError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith('HTTP 403')) {
    return 'No puedes comentar esta oferta: no se ha podido verificar que tengas una compra activa como comprador.';
  }
  if (message.startsWith('HTTP 409')) {
    return 'Ya has publicado un comentario para esta oferta.';
  }
  if (message.startsWith('HTTP 400')) {
    return 'Los datos del comentario no son válidos. Revisa la valoración y el texto.';
  }
  return 'No se pudo publicar el comentario. Inténtalo de nuevo más tarde.';
}

export interface OfferingCommentsProps {
  offeringId: string;
}

/** OfferingComments - Comments and ratings section of an offering */
export function OfferingComments({ offeringId }: Readonly<OfferingCommentsProps>) {
  const commentsQuery = useOfferingComments(offeringId);
  const sessionQuery = useCurrentSessionQuery();
  const hasSession = sessionQuery.data?.ok ?? false;
  const buyerQuery = useProductInventoriesAsBuyer({ enabled: hasSession });
  const createComment = useCreateOfferingComment(offeringId);

  const comments = commentsQuery.data?.comments ?? [];
  const average = commentsQuery.data?.average ?? 0;
  const count = commentsQuery.data?.count ?? 0;

  const organizationId = sessionQuery.data?.userProfile?.organizationId;
  const alreadyCommented =
    !!organizationId && comments.some((c) => c.organizationId === organizationId);
  const isActiveBuyer = (buyerQuery.data ?? []).some(
    (product) => product.status === 'active' && product.productOffering?.id === offeringId,
  );

  const handleSubmitComment = async (data: ReviewCommentFormData) => {
    try {
      await createComment.mutateAsync({ rating: data.rating, body: data.body || null });
    } catch (err) {
      throw new Error(mapSubmitError(err));
    }
  };

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
        buyerLoading={buyerQuery.isLoading}
        isActiveBuyer={isActiveBuyer}
        alreadyCommented={alreadyCommented}
        onSubmit={handleSubmitComment}
        isPending={createComment.isPending}
      />

      {commentsQuery.isLoading && (
        <Typography variant="small" color="gray">
          Cargando comentarios…
        </Typography>
      )}

      {commentsQuery.isError && (
        <Typography variant="small" className="text-danger" role="alert">
          No se pudieron cargar los comentarios. Inténtalo de nuevo más tarde.
        </Typography>
      )}

      {!commentsQuery.isLoading && !commentsQuery.isError && comments.length > 0 && (
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
