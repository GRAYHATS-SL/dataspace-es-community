'use client';

import Button from '@/components/atoms/Button';
import { cn } from '@/lib/utils/cn';

/** Props of `FilterPill`. */
export interface FilterPillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/** FilterPill - Toggle pill used in filter panels. */
const FilterPill = ({ label, selected, onClick }: Readonly<FilterPillProps>) => (
  <Button
    size="xs"
    variant={selected ? 'primary' : 'ghost'}
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      'font-medium shadow-none',
      !selected &&
        'bg-white text-black ring-1 ring-gray-200 hover:text-primary hover:ring-primary focus:ring-primary',
    )}
  >
    {label}
  </Button>
);

export default FilterPill;
