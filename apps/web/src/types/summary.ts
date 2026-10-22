// Common types for form summary components
import { ReactNode } from 'react';

export type SummaryValueType = string | ReactNode;

export interface SummaryFieldProps {
  label: string;
  value: SummaryValueType;
  isLink?: boolean;
  className?: string;
}

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
