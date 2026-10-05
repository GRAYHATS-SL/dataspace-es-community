import type { ReactNode } from 'react';

import Typography from '@/components/atoms/Typography';

/** Props of `DetailRow`. */
export interface DetailRowProps {
  label: string;
  value: ReactNode;
}

/** DetailRow - Label + value row of an order detail (renders nothing when empty). */
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
