import StarRating from '@/components/atoms/StarRating';
import Typography from '@/components/atoms/Typography';
import type { ReviewComment } from '@/lib/services/queries/reviewComments';

function formatCommentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export interface CommentItemProps {
  comment: ReviewComment;
}

/**
 * CommentItem - Single offering comment
 *
 * @param {ReviewComment} comment - Comment to show.
 */
function CommentItem({ comment }: Readonly<CommentItemProps>) {
  return (
    <li className="flex flex-col gap-2 border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <StarRating readOnly value={comment.rating} size={16} />
        <Typography variant="form-hint" color="gray">
          {formatCommentDate(comment.createdAt)}
        </Typography>
      </div>
      {comment.body && (
        <Typography variant="body" color="black">
          {comment.body}
        </Typography>
      )}
    </li>
  );
}

export default CommentItem;
