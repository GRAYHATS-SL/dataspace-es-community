import * as LucideIcons from 'lucide-react';

// Valid icon names from Lucide
export type ValidIconName = keyof typeof LucideIcons;

const FALLBACK_ICON: ValidIconName = 'Database';

// Map avoids Object.prototype bracket-notation injection
const iconMap = new Map<string, ValidIconName>([
  ['Info', 'Info'],
  ['Package', 'Package'],
  ['Scale', 'Scale'],
  ['Workflow', 'Workflow'],
  ['Database', 'Database'],
  ['Zap', 'Zap'],
  ['Clock', 'Clock'],
  ['Map', 'Map'],
  ['FileSpreadsheet', 'FileSpreadsheet'],
  ['ChevronRight', 'ChevronRight'],
  ['ChevronDown', 'ChevronDown'],
  ['LockOpen', 'LockOpen'],
  ['CheckCircle', 'CheckCircle'],
  ['Search', 'Search'],
  ['Settings', 'Settings'],
  ['Copy', 'Copy'],
  ['Check', 'Check'],
  ['Code', 'Code'],
  ['MessageCircle', 'MessageCircle'],
  ['Users', 'Users'],
  ['Phone', 'Phone'],
  ['Bookmark', 'Bookmark'],
  ['Edit', 'Edit'],
  ['RefreshCw', 'RefreshCw'],
  ['RotateCcw', 'RotateCcw'],
  ['Home', 'Home'],
  ['ArrowLeft', 'ArrowLeft'],
  ['CloudDownload', 'CloudDownload'],
  ['Download', 'Download'],
  ['X', 'X'],
  ['Eye', 'Eye'],
  ['EyeOff', 'EyeOff'],
  ['Mail', 'Mail'],
  ['Lock', 'Lock'],
  ['AtSign', 'AtSign'],
  ['Menu', 'Menu'],
]);

export function mapIcon(iconName: string): ValidIconName {
  return iconMap.get(iconName) ?? FALLBACK_ICON;
}

export function isValidIconName(iconName: string): iconName is ValidIconName {
  return Object.hasOwn(LucideIcons, iconName);
}

export function safeIconName(iconName: string): ValidIconName {
  if (isValidIconName(iconName)) {
    return iconName;
  }
  return mapIcon(iconName);
}
