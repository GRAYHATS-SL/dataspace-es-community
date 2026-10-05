'use client';

import { useEffect, useRef } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Props of `Drawer`. */
export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Keeps Tab / Shift+Tab focus inside the panel. */
function trapFocus(e: KeyboardEvent, panel: HTMLElement | null): void {
  if (e.key !== 'Tab' || !panel) return;
  const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
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
}

/** Drawer - Accessible right side panel (focus trap, Escape to close, backdrop). */
export default function Drawer({
  open,
  onClose,
  title,
  description,
  children,
}: Readonly<DrawerProps>) {
  const panelRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      panel.removeAttribute('inert');
      panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    } else {
      panel.setAttribute('inert', '');
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else trapFocus(e, panelRef.current);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
        className={cn(
          'fixed inset-y-0 right-0 left-auto z-30 flex h-screen flex-col border-l border-gray-lightest bg-white sm:w-full md:w-1/2 xl:w-2/5',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Spacer that keeps the panel below the sticky header. */}
        <div className="h-36 shrink-0" aria-hidden="true" />

        <div className="shrink-0 border-b border-gray-lightest px-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Typography
                as="h2"
                variant="subtitle"
                color="primary"
                className="leading-tight font-semibold"
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

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </dialog>
    </>
  );
}
