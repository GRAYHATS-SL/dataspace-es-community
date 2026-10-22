import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import ReviewCommentForm from '@/components/molecules/ReviewCommentForm';
import type { ReviewCommentFormData } from '@/lib/validations/reviewComment.schema';

export interface CommentFormAreaProps {
  sessionLoading: boolean;
  hasSession: boolean;
  buyerLoading: boolean;
  isActiveBuyer: boolean;
  alreadyCommented: boolean;
  onSubmit: (data: ReviewCommentFormData) => Promise<void>;
  isPending: boolean;
}

/**
 * CommentFormArea - Rating form area with its eligibility states
 *
 * @param {boolean} sessionLoading - Session is resolving.
 * @param {boolean} hasSession - There is an active session.
 * @param {boolean} buyerLoading - Purchase check in progress.
 * @param {boolean} isActiveBuyer - Organization has an active purchase.
 * @param {boolean} alreadyCommented - Organization already commented.
 * @param {(data: ReviewCommentFormData) => Promise<void>} onSubmit - Called on submit.
 * @param {boolean} isPending - Submission in progress.
 */
function CommentFormArea({
  sessionLoading,
  hasSession,
  buyerLoading,
  isActiveBuyer,
  alreadyCommented,
  onSubmit,
  isPending,
}: Readonly<CommentFormAreaProps>) {
  if (sessionLoading || (hasSession && buyerLoading)) {
    return (
      <Typography variant="small" color="gray">
        Comprobando si puedes valorar esta oferta…
      </Typography>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-muted/40 p-4">
        <Icon name="Info" size={16} className="mt-0.5 shrink-0 text-gray-400" />
        <Typography variant="small" color="gray">
          <Link href="/inicio-sesion" variant="primary" underline="hover">
            Inicia sesión
          </Link>{' '}
          con una organización que haya adquirido esta oferta para dejar tu valoración.
        </Typography>
      </div>
    );
  }

  if (alreadyCommented) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-muted/40 p-4">
        <Icon name="CheckCircle" size={16} className="mt-0.5 shrink-0 text-success" />
        <Typography variant="small" color="gray">
          Ya has valorado esta oferta. ¡Gracias por tu opinión!
        </Typography>
      </div>
    );
  }

  if (!isActiveBuyer) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-gray-100 bg-muted/40 p-4">
        <Icon name="Info" size={16} className="mt-0.5 shrink-0 text-gray-400" />
        <Typography variant="small" color="gray">
          Solo las organizaciones con una compra activa de esta oferta pueden dejar una valoración.
        </Typography>
      </div>
    );
  }

  return <ReviewCommentForm onSubmit={onSubmit} isPending={isPending} />;
}

export default CommentFormArea;
