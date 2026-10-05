import StarRating from '@/components/atoms/StarRating';
import Typography from '@/components/atoms/Typography';
import { formatDateEs } from '@/lib/utils/offeringMetadata';
import type { ReviewComment } from '@/types/api';

/** Props of `CommentItem`. */
export interface CommentItemProps {
  comment: ReviewComment;
}

/** CommentItem - Single review (rating, date and text). */
function CommentItem({ comment }: Readonly<CommentItemProps>) {
  return (
    <li className="flex flex-col gap-2 border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <StarRating readOnly value={comment.rating} size={16} />
        <Typography variant="form-hint" color="gray">
          {formatDateEs(comment.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}
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
