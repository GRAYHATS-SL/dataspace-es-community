import Badge from '@/components/atoms/Badge';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';
import type { BadgeListProps } from '@/types/badge';

import InteractiveBadgeItem from './InteractiveBadgeItem';

/**
 * BadgeList - Reusable list of static or interactive badges
 *
 * @example
 * <BadgeList
 *   items={categories}
 *   selectedItems={selected}
 *   onChange={handleSelection}
 *   mode="interactive"
 *   variant="button"
 * />
 */

const BadgeList: React.FC<Readonly<BadgeListProps>> = ({
  items,
  selectedItems = [],
  onChange,
  className,
  mode = 'static',
  variant = 'badge',
  label,
  description,
  emptyMessage = 'No hay elementos',
  maxSelections,
}) => {
  // Filter out empty items
  const validItems = items.filter((item) => item.label.trim().length > 0);

  const toggleItem = (itemId: string) => {
    if (!onChange || mode !== 'interactive') return;
    const isSelected = selectedItems.includes(itemId);
    let newSelection: string[];
    if (isSelected) {
      newSelection = selectedItems.filter((id) => id !== itemId);
    } else {
      if (maxSelections && selectedItems.length >= maxSelections) {
        return;
      }
      newSelection = [...selectedItems, itemId];
    }
    onChange(newSelection);
  };

  if (validItems.length === 0) {
    return (
      <Typography variant="small" color="gray">
        {emptyMessage}
      </Typography>
    );
  }

  const renderStaticBadges = () => (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {validItems.map((item) => (
        <Badge
          key={item.id}
          variant="alt"
          size="sm"
          className="font-medium tracking-normal normal-case"
        >
          {item.label}
        </Badge>
      ))}
    </div>
  );

  const renderInteractiveBadges = () => (
    <div className={cn('space-y-4', className)}>
      {(label || description) && (
        <div className="flex flex-col gap-1">
          {label && (
            <Typography as="label" variant="small" className="font-semibold">
              {label}
            </Typography>
          )}
          {description && (
            <Typography variant="small" color="gray">
              {description}
            </Typography>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {validItems.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          const isDisabled = !!(
            maxSelections &&
            !isSelected &&
            selectedItems.length >= maxSelections
          );
          return (
            <InteractiveBadgeItem
              key={item.id}
              item={item}
              isSelected={isSelected}
              isDisabled={isDisabled}
              variant={variant}
              onToggle={() => toggleItem(item.id)}
            />
          );
        })}
      </div>
    </div>
  );

  return mode === 'interactive' ? renderInteractiveBadges() : renderStaticBadges();
};

export default BadgeList;
