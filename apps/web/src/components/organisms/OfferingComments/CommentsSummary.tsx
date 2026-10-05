import StarRating from '@/components/atoms/StarRating';
import Typography from '@/components/atoms/Typography';

/** Props of `CommentsSummary`. */
export interface CommentsSummaryProps {
  average: number;
  count: number;
}

/** CommentsSummary - Average rating and number of reviews of an offering. */
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
