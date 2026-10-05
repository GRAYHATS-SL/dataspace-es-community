'use client';

import { useState } from 'react';

import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils/cn';

/** Props of `AccordionSection`. */
export interface AccordionSectionProps {
  label: string;
  activeCount: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}

/** AccordionSection - Collapsible filter section with an active-filters badge. */
const AccordionSection = ({
  label,
  activeCount,
  defaultOpen,
  children,
}: Readonly<AccordionSectionProps>) => {
  const [open, setOpen] = useState(defaultOpen);
  const plural = activeCount === 1 ? '' : 's';
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/60"
      >
        <span className="flex items-center gap-2">
          <Typography variant="caption" color="gray" className="leading-none font-medium">
            {label}
          </Typography>
          {activeCount > 0 && (
            <span
              aria-label={`${activeCount} filtro${plural} activo${plural}`}
              className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-2xs font-semibold text-primary"
            >
              {activeCount}
            </span>
          )}
        </span>
        <Icon
          name="ChevronDown"
          size={14}
          className={cn(
            'shrink-0 text-gray-light transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="flex flex-col gap-4 px-4 pb-4">{children}</div>}
    </div>
  );
};

export default AccordionSection;
