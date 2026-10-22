import BadgeList from '@/components/molecules/BadgeList';
import type { BadgeItem } from '@/types/badge';

/**
 * DataFormatBadgeSelector - Multi-select of data formats using interactive badges
 *
 * @example
 * <DataFormatBadgeSelector
 *   items={availableFormats}
 *   selectedItems={selected}
 *   onChange={handleFormatChange}
 * />
 */

interface DataFormatBadgeSelectorProps {
  items: BadgeItem[];
  selectedItems: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function DataFormatBadgeSelector({
  items,
  selectedItems,
  onChange,
  className,
}: Readonly<DataFormatBadgeSelectorProps>) {
  return (
    <BadgeList
      items={items}
      selectedItems={selectedItems}
      onChange={onChange}
      mode="interactive"
      variant="button"
      label="Formatos de datos de interés"
      description="Selecciona todos los formatos que planeas integrar."
      className={className}
    />
  );
}
