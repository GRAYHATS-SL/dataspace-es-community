// Common types for badges/tags and selectors

export interface BadgeItem {
  id: string;
  label: string;
}

export type BadgeDisplayMode = 'static' | 'interactive';
export type BadgeVariant = 'badge' | 'button';

export interface BadgeListProps {
  items: BadgeItem[];
  selectedItems?: string[];
  onChange?: (selectedIds: string[]) => void;
  className?: string;
  mode?: BadgeDisplayMode;
  variant?: BadgeVariant;
  label?: string;
  description?: string;
  emptyMessage?: string;
  maxSelections?: number;
}
