'use client';

import { usePathname } from 'next/navigation';

/**
 * Routes that render a hero block. Add a route here so the Header starts in
 * transparent mode from SSR.
 */
const ROUTES_WITH_HERO = new Set<string>(['/']);

/**
 * Returns whether the current route renders a hero block (derived from `pathname`).
 *
 * @example
 * const { hasHero } = useHeroDetection();
 */
export const useHeroDetection = (): { hasHero: boolean } => {
  const pathname = usePathname();
  return { hasHero: ROUTES_WITH_HERO.has(pathname) };
};
