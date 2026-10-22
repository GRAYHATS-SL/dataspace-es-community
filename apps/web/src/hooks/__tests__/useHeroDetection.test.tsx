import { renderHook } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { useHeroDetection } from '@/hooks/useHeroDetection';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const ROUTES_WITH_HERO = [
  '/',
  '/acuerdo-marco',
  '/aviso-legal',
  '/politica-privacidad',
  '/politica-cookies',
  '/politica-gobernanza',
  '/politica-uso-datos',
];

describe('useHeroDetection', () => {
  it.each(ROUTES_WITH_HERO)('returns hasHero: true for %s', (route) => {
    vi.mocked(usePathname).mockReturnValue(route);
    const { result } = renderHook(() => useHeroDetection());
    expect(result.current.hasHero).toBe(true);
  });

  it('returns hasHero: false for a route not in ROUTES_WITH_HERO', () => {
    vi.mocked(usePathname).mockReturnValue('/dashboard/ofertas');
    const { result } = renderHook(() => useHeroDetection());
    expect(result.current.hasHero).toBe(false);
  });
});
