import BadgeList from '@/components/molecules/BadgeList';
import type { BadgeItem } from '@/types/badge';

/** Props of `DataFormatBadgeSelector`. */
export interface DataFormatBadgeSelectorProps {
  items: BadgeItem[];
  selectedItems: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

/** Multi-select of data formats rendered as interactive badges. */
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
