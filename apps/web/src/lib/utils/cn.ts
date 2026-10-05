import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names and resolves Tailwind conflicts via `tailwind-merge`.
 *
 * Accepts the same arguments as `clsx` — strings, arrays, objects with boolean
 * values — and returns a single de-duplicated, conflict-free class string.
 *
 * @param inputs - Class name arguments (same signature as `clsx`)
 * @returns Merged class string safe for use in `className` props
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', 'bg-gray-100')
 * // isActive=true  → 'px-4 py-2 bg-primary'
 * // isActive=false → 'px-4 py-2 bg-gray-100'
 */
export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}
