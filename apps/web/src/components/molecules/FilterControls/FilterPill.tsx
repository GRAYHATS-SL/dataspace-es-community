'use client';

import Button from '@/components/atoms/Button';
import { cn } from '@/lib/utils/cn';

export interface FilterPillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * FilterPill - Reusable toggle pill for filter panels
 *
 * @param {string} label - Pill text.
 * @param {boolean} selected - Whether the filter is active.
 * @param {() => void} onClick - Click callback.
 */
const FilterPill = ({ label, selected, onClick }: Readonly<FilterPillProps>) => (
  <Button
    size="xs"
    variant={selected ? 'primary' : 'ghost'}
    aria-pressed={selected}
    onClick={onClick}
    className={cn(
      'font-medium shadow-none',
      !selected &&
        'bg-white text-black ring-1 ring-gray-200 hover:ring-primary hover:text-primary focus:ring-primary',
    )}
  >
    {label}
  </Button>
);

export default FilterPill;
