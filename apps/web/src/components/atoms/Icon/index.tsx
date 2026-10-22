import type { LucideProps } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import { safeIconName } from '@/lib/utils/safeIconName';

export type { ValidIconName } from '@/lib/utils/safeIconName';

interface IconProps extends Omit<LucideProps, 'name'> {
  name: string;
  size?: number | string;
}

/**
 * Icon - Typed wrapper over lucide-react icons
 *
 * @param {string} name - Lucide icon name.
 * @param {number|string} [size=20] - Icon width and height.
 * @param {LucideProps} props - Remaining lucide-react icon props.
 */
const Icon: React.FC<Readonly<IconProps>> = ({ name, size = 20, ...props }) => {
  const LucideIcon = LucideIcons[safeIconName(name)] as React.FC<LucideProps>;
  return <LucideIcon width={size} height={size} {...props} />;
};

export default Icon;
