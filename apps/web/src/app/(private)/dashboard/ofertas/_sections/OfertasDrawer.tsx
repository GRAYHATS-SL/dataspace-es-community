'use client';

import { useEffect, useRef } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface OfertasDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function OfertasDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: Readonly<OfertasDrawerProps>) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture trigger element, toggle inert, move focus
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      panel.removeAttribute('inert');
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    } else {
      panel.setAttribute('inert', '');
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [open]);

  // Escape key closes the drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap: cycle Tab / Shift+Tab within the panel
  useEffect(() => {
    if (!open) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      <dialog
        ref={panelRef}
        aria-label={title}
        aria-modal="true"
        className={[
          'fixed inset-y-0 right-0 left-auto h-screen z-30 sm:w-full md:w-1/2 xl:w-2/5 bg-white border-l border-gray-lightest flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Spacer que respeta el header sticky (~144px) */}
        <div className="h-36 shrink-0" aria-hidden="true" />

        {/* Cabecera del panel */}
        <div className="shrink-0 border-b border-gray-lightest px-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Typography
                as="h2"
                variant="subtitle"
                color="primary"
                className="font-semibold leading-tight"
              >
                {title}
              </Typography>
              {description && (
                <Typography variant="small" color="gray" className="mt-0.5 line-clamp-2">
                  {description}
                </Typography>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Cerrar panel"
              className="shrink-0"
            >
              <Icon name="X" size={14} aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Cuerpo con scroll independiente */}
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </dialog>
    </>
  );
}
