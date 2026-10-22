'use client';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import { useNotifications } from '@/lib/providers/NotificationsProvider';
import type { BusinessRole, UserProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { formatDid } from '@/lib/utils/formatDid';

/**
 * DropdownMenu - User profile menu with navigation dropdown
 *
 * @param {UserProfile} user - Authenticated user.
 * @param {boolean} [thereIsHero=false] - Whether the current page has a Hero.
 * @param {string} [className] - Additional CSS classes.
 * @param {() => void} onLogout - Logout callback.
 */

interface DropdownMenuProps {
  user: UserProfile;
  thereIsHero?: boolean;
  className?: string;
  onLogout: () => void;
}

interface DropdownRoute {
  label: string;
  href: string;
  icon: string;
  disabled?: boolean;
  /** Roles that see this item; undefined means any authenticated user. */
  roles?: BusinessRole[];
}

const DROPDOWN_ROUTES: DropdownRoute[] = [
  { label: 'Dashboard', href: '/dashboard/', icon: 'MonitorCloud' },
  { label: 'Ver perfil', href: '/dashboard/perfil', icon: 'User' },
  { label: 'Mis ofertas', href: '/dashboard/ofertas', icon: 'HandCoins', roles: ['proveedor'] },
  { label: 'Ordenes de producto', href: '/dashboard/ordenes-producto', icon: 'ReceiptText' },
  { label: 'Mis acuerdos', href: '/dashboard/acuerdos', icon: 'FileCheck' },
  { label: 'Mis productos', href: '/dashboard/mis-productos', icon: 'Database' },
  { label: 'Consumo', href: '/dashboard/consumo', icon: 'Activity' },
];

export default function DropdownMenu({
  user,
  thereIsHero = false,
  className,
  onLogout,
}: Readonly<DropdownMenuProps>) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  const closeMenu = () => {
    setIsDropdownOpen(false);
    triggerRef.current?.focus();
  };

  // Close with Esc and restore focus to the trigger
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent | KeyboardEventInit) => {
      if (e.key === 'Escape') closeMenu();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Focus the first item on open
  useEffect(() => {
    if (!isDropdownOpen) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    );
    firstItem?.focus();
  }, [isDropdownOpen]);

  // Close when focus is lost
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isDropdownOpen]);

  if (!user) return null;

  // Sessions created before `businessRoles` was introduced do not have it in the persisted cookie (it is not re-derived from the JWT on every request) — both roles are assumed in that case.
  const businessRoles = user.businessRoles ?? ['proveedor', 'consumidor'];
  const visibleRoutes = DROPDOWN_ROUTES.filter(
    (route) => !route.roles || route.roles.some((role) => businessRoles.includes(role)),
  );

  const rawName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name;
  const rawSecondary = user.email || user.organization || user.sub;
  // If there is no name/email/organization, the only available datum is the DID (sub) — it is truncated so as not to break the layout, keeping the full value in the container's `title`.
  const displayName = rawName === user.sub ? formatDid(rawName) : rawName;
  const displaySecondary = rawSecondary === user.sub ? formatDid(rawSecondary) : rawSecondary;
  const fullValuesTitle =
    displayName !== rawName || displaySecondary !== rawSecondary
      ? `${rawName} — ${rawSecondary}`
      : undefined;

  return (
    <div className={cn('flex items-center gap-3 pl-6', className)} ref={dropdownRef}>
      {/* Profile Menu */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-haspopup="menu"
          aria-expanded={isDropdownOpen}
          aria-label={`Menú de usuario: ${displayName}`}
        >
          {/* User Info */}
          <div className="hidden text-right sm:block" title={fullValuesTitle}>
            <Typography
              variant="small"
              color={thereIsHero ? 'white' : 'primary'}
              className="font-bold"
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              color={thereIsHero ? 'white' : 'gray'}
              className="tracking-wider"
            >
              {displaySecondary}
            </Typography>
          </div>
          <div className="relative">
            <Icon
              name="User"
              className="border rounded-full p-1 bg-primary text-white hover:bg-primary/80 transition-colors duration-200"
              size={32}
            />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            )}
          </div>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <>
            {/* Backdrop */}
            <div aria-hidden="true" className="fixed inset-0 z-10" onClick={closeMenu} />
            {/* Menu */}
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Opciones de ${displayName}`}
              className="border-muted absolute top-full right-0 z-20 mt-2 w-48 rounded-lg border bg-white py-2 shadow-lg"
            >
              {visibleRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  role="menuitem"
                  aria-disabled={route.disabled}
                  className={cn(
                    'block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50',
                    route.disabled && 'cursor-not-allowed opacity-50',
                  )}
                  onClick={() => closeMenu()}
                  variant="unstyled"
                >
                  <div className="flex items-center gap-2">
                    <Icon name={route.icon} size={16} aria-hidden="true" />
                    {route.label}
                    {route.href === '/dashboard/ordenes-producto' && unreadCount > 0 && (
                      <span
                        aria-label={`${unreadCount} notificaciones sin leer`}
                        className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              ))}

              <button
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onLogout();
                }}
                className="block w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50  border-t border-muted"
              >
                <div className="flex items-center gap-2">
                  <Icon name="LogOut" size={16} aria-hidden="true" />
                  Cerrar sesión
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
