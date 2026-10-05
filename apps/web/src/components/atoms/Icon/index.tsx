import type { LucideProps } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import { safeIconName } from '@/lib/utils/safeIconName';

export type { ValidIconName } from '@/lib/utils/safeIconName';

interface IconProps extends Omit<LucideProps, 'name'> {
  name: string;
  size?: number | string;
}

/**
 * Icon - Typed wrapper around lucide-react icons.
 * Unknown names fall back to a default icon via `safeIconName`.
 */
const Icon: React.FC<Readonly<IconProps>> = ({ name, size = 20, ...props }) => {
  const LucideIcon = LucideIcons[safeIconName(name)] as React.FC<LucideProps>;
  return <LucideIcon width={size} height={size} {...props} />;
};

export default Icon;
