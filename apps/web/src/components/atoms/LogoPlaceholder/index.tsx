import React from 'react';

import { cn } from '@/lib/utils';

export interface LogoPlaceholderProps {
  /** Size/position classes of the slot (same as the image container it replaces). */
  className?: string;
  /** Visual tone: `light` over dark backgrounds, `dark` over light backgrounds. */
  tone?: 'light' | 'dark';
  label?: string;
}

/** LogoPlaceholder - Reserved slot for a logo. Here you place your own `next/image`. */
const LogoPlaceholder: React.FC<Readonly<LogoPlaceholderProps>> = ({
  className,
  tone = 'light',
  label = 'Logo',
}) => (
  <div
    aria-hidden="true"
    className={cn(
      'flex h-14 w-40 shrink-0 items-center justify-center rounded-md border border-dashed text-xs font-medium uppercase tracking-widest',
      tone === 'light' ? 'border-white/30 text-white/50' : 'border-gray-lightest text-gray-light',
      className,
    )}
  >
    {label}
  </div>
);

export default LogoPlaceholder;
