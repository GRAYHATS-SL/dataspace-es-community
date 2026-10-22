'use client';

import { usePathname } from 'next/navigation';

/** Routes that include a hero block. */
const ROUTES_WITH_HERO = new Set([
  '/',
  '/acuerdo-marco',
  '/aviso-legal',
  '/politica-privacidad',
  '/politica-cookies',
  '/politica-gobernanza',
  '/politica-uso-datos',
]);

/**
 * Hook that tells whether the current page has a hero.
 *
 * @example
 * const { hasHero } = useHeroDetection();
 */
export const useHeroDetection = (): { hasHero: boolean } => {
  const pathname = usePathname();
  return { hasHero: ROUTES_WITH_HERO.has(pathname) };
};
