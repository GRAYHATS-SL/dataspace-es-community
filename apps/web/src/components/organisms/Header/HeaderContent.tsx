'use client';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Link from '@/components/atoms/Link';
import MainLogo from '@/components/atoms/MainLogo';
import DropdownMenu from '@/components/molecules/DropdownMenu';
import Navigation, { type NavItem } from '@/components/molecules/Navigation';
import { useHeroDetection } from '@/hooks/useHeroDetection';
import { logout } from '@/lib/services/auth';
import type { UserProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { identifySentryUser } from '@/lib/utils/sentry';

const NAV_LINKS: NavItem[] = [{ href: '/catalogo', label: 'Catálogo' }];

export interface HeaderContentProps {
  user: UserProfile | null;
  className?: string;
}

/**
 * HeaderContent - App header (logo, navigation, user actions).
 * Background and text color adapt when the current page has a hero.
 */
export function HeaderContent({ user, className }: Readonly<HeaderContentProps>) {
  const { hasHero } = useHeroDetection();

  const handleLogout = async () => {
    identifySentryUser(null);
    await logout();
    globalThis.location.href = '/inicio-sesion';
  };

  return (
    <header
      className={cn(
        'top-0 left-0 z-50 w-full transition-colors duration-300 ease-in-out',
        hasHero
          ? 'absolute bg-transparent text-white'
          : 'text-primary border-gray-lightest sticky border-b bg-white',
        className,
      )}
      role="banner"
    >
      <Container>
        <div className="flex items-center justify-between py-4 whitespace-nowrap">
          <Link
            href="/"
            className="flex items-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary rounded-md"
            aria-label="Ir al inicio"
          >
            <MainLogo
              className={cn(
                'h-auto w-28 sm:w-32 md:w-40 lg:w-52',
                hasHero ? 'text-white' : 'text-primary',
              )}
            />
          </Link>

          <div className="flex items-center">
            <Navigation
              links={NAV_LINKS}
              variant="header"
              hasHero={hasHero}
              orientation="horizontal"
              className="mr-6 hidden md:flex"
            />

            {user ? (
              <DropdownMenu user={user} thereIsHero={hasHero} onLogout={handleLogout} />
            ) : (
              <Link href="/inicio-sesion">
                <Button type="button" size="md" variant="primary" className="cursor-pointer">
                  Accede al portal
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}
