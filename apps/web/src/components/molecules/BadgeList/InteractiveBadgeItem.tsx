import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import { cn } from '@/lib/utils';
import type { BadgeItem, BadgeVariant } from '@/types/badge';

/** Props of `InteractiveBadgeItem`. */
export interface InteractiveBadgeItemProps {
  item: BadgeItem;
  isSelected: boolean;
  isDisabled: boolean;
  variant: BadgeVariant;
  onToggle: () => void;
}

/** Selectable item of an interactive `BadgeList`, rendered as a button or a badge. */
function InteractiveBadgeItem({
  item,
  isSelected,
  isDisabled,
  variant,
  onToggle,
}: Readonly<InteractiveBadgeItemProps>) {
  if (variant === 'button') {
    return (
      <Button
        type="button"
        variant={isSelected ? 'primary' : 'outline'}
        size="md"
        onClick={onToggle}
        disabled={isDisabled}
      >
        {item.label}
        <Icon name={isSelected ? 'X' : 'Plus'} size={15} className="ml-2" />
      </Button>
    );
  }

  return (
    <Badge
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      variant={isSelected ? 'filled' : 'outline'}
      size="default"
      className={cn(
        'cursor-pointer font-medium tracking-normal normal-case transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isSelected && 'bg-primary text-white',
        !isSelected && 'hover:bg-primary/10',
        isDisabled && 'cursor-not-allowed opacity-50',
      )}
      onClick={() => !isDisabled && onToggle()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {item.label}
    </Badge>
  );
}

export default InteractiveBadgeItem;
