'use client';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import type { UserProfile } from '@/lib/session';
import { cn } from '@/lib/utils';

/**
 * DropdownMenu - User profile menu with navigation links.
 * Presentational only: the parent owns the logout flow via `onLogout`.
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
  /** Roles allowed to see this item. Undefined = any authenticated user. */
  roles?: string[];
}

// Here you define your authorization rules (set `roles` on the routes that require them).
const DROPDOWN_ROUTES: DropdownRoute[] = [
  { label: 'Dashboard', href: '/dashboard/', icon: 'MonitorCloud' },
  { label: 'Ver perfil', href: '/dashboard/perfil', icon: 'User' },
  { label: 'Publicar', href: '/dashboard/publicar', icon: 'CloudUpload' },
  { label: 'Mis ofertas', href: '/dashboard/ofertas', icon: 'HandCoins' },
  { label: 'Mis productos', href: '/dashboard/mis-productos', icon: 'Database' },
  { label: 'Gestión de productos', href: '/dashboard/productManagement', icon: 'Settings' },
  { label: 'Órdenes de producto', href: '/dashboard/ordenes-producto', icon: 'ReceiptText' },
  { label: 'Mis acuerdos', href: '/dashboard/acuerdos', icon: 'FileCheck' },
  { label: 'Mi inventario', href: '/dashboard/inventario', icon: 'Archive' },
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
  // Here you define the unread notifications counter (e.g. from a notifications provider).
  const unreadCount = 0 as number;

  const closeMenu = () => {
    setIsDropdownOpen(false);
    triggerRef.current?.focus();
  };

  // Close on Escape and restore focus to the trigger
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleKeyDown = (e: KeyboardEvent | KeyboardEventInit) => {
      if (e.key === 'Escape') closeMenu();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Focus the first item when opening
  useEffect(() => {
    if (!isDropdownOpen) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled])',
    );
    firstItem?.focus();
  }, [isDropdownOpen]);

  // Close on outside click
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

  // Here you define your authorization rules (which roles see which routes).
  const userRoles = user.roles ?? [];
  const visibleRoutes = DROPDOWN_ROUTES.filter(
    (route) => !route.roles || route.roles.some((role) => userRoles.includes(role)),
  );

  const displayName = user.name || user.sub;
  const displaySecondary = user.email ?? '';
  const fullValuesTitle = displaySecondary ? `${displayName} — ${displaySecondary}` : displayName;

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
