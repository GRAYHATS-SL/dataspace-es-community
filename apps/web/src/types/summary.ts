// Shared types for form summary components.
import type { ReactNode } from 'react';

/** Value rendered in a summary field. */
export type SummaryValueType = string | ReactNode;

/** Props of a summary field (label + value). */
export interface SummaryFieldProps {
  label: string;
  value: SummaryValueType;
  isLink?: boolean;
  className?: string;
}

/** Props of `SummarySection`. */
export interface SummarySectionProps {
  title: string;
  icon: string;
  onEdit: () => void;
  children: ReactNode;
  className?: string;
  backgroundColor?: 'white' | 'muted';
  editButtonText?: string;
  editButtonIcon?: string;
}
