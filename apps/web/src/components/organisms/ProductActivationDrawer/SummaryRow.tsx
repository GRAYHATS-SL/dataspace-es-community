import type { ReactNode } from 'react';

import Typography from '@/components/atoms/Typography';

/** Props of `SummaryRow`. */
export interface SummaryRowProps {
  label: string;
  value: ReactNode;
}

/** SummaryRow - Label/value row of the activation summary. */
function SummaryRow({ label, value }: Readonly<SummaryRowProps>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-0">
      <Typography variant="small" color="gray" className="shrink-0">
        {label}
      </Typography>
      <Typography variant="small" className="break-all text-right">
        {value ?? '—'}
      </Typography>
    </div>
  );
}

export default SummaryRow;
