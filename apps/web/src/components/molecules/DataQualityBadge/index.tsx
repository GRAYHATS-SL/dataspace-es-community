import Badge from '@/components/atoms/Badge';
import { cn } from '@/lib/utils/cn';
import { classifyDataQuality } from '@/lib/utils/dataQuality';

export interface DataQualityBadgeProps {
  score: number;
  showScore?: boolean;
  className?: string;
}

/**
 * DataQualityBadge - Badge classifying a data quality score
 *
 * @param {number} score - Quality score (0-100).
 * @param {boolean} [showScore=true] - Shows the numeric percentage.
 * @param {string} [className] - Additional CSS classes.
 */
const DataQualityBadge = ({
  score,
  showScore = true,
  className,
}: Readonly<DataQualityBadgeProps>) => {
  const category = classifyDataQuality(score);
  return (
    <Badge variant="outline" className={cn(category.colorClassName, className)}>
      {category.label}
      {showScore && ` · ${Math.round(score)}%`}
    </Badge>
  );
};

export default DataQualityBadge;
