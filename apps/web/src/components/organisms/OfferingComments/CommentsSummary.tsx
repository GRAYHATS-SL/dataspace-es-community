import StarRating from '@/components/atoms/StarRating';
import Typography from '@/components/atoms/Typography';

export interface CommentsSummaryProps {
  average: number;
  count: number;
}

/**
 * CommentsSummary - Average rating and comment count of an offering
 *
 * @param {number} average - Average rating (0-5).
 * @param {number} count - Total comments.
 */
export function CommentsSummary({ average, count }: Readonly<CommentsSummaryProps>) {
  if (count === 0) {
    return (
      <Typography variant="small" color="gray">
        Todavía no hay valoraciones para esta oferta.
      </Typography>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <StarRating readOnly value={average} size={20} />
      <Typography variant="small" color="gray">
        {average.toFixed(1)} de 5 · {count} valoración{count === 1 ? '' : 'es'}
      </Typography>
    </div>
  );
}

export default CommentsSummary;
