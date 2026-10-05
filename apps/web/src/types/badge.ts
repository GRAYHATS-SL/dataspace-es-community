// Shared types for badges, tags and badge selectors.

/** Selectable badge item. */
export interface BadgeItem {
  id: string;
  label: string;
}

/** Badge list display mode. */
export type BadgeDisplayMode = 'static' | 'interactive';

/** Badge visual variant. */
export type BadgeVariant = 'badge' | 'button';

/** Props of `BadgeList`. */
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
