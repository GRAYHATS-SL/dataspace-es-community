import type { ReactNode } from 'react';

import Typography from '@/components/atoms/Typography';

export interface DetailRowProps {
  label: string;
  value: ReactNode;
}

/**
 * DetailRow - Label + value row
 *
 * @param {string} label - Row label.
 * @param {ReactNode} value - Value to show.
 */
function DetailRow({ label, value }: Readonly<DetailRowProps>) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <Typography variant="small" color="gray" className="shrink-0">
        {label}
      </Typography>
      <Typography variant="small" className="text-right">
        {value}
      </Typography>
    </div>
  );
}

export default DetailRow;
