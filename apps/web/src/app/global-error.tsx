'use client';

import './globals.css';

import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import MainLogo from '@/components/atoms/MainLogo';
import { trackError } from '@/lib/utils/sentry';

/** Replaces the whole root layout when it fails, so it renders its own `<html>` and `<body>`. */
export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    trackError(error, { boundary: 'global' });
  }, [error]);

  return (
    <html lang="es">
      <body className="antialiased font-sans">
        <div className="min-h-screen corporate-gradient flex flex-col">
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 gap-10">
            <MainLogo width={180 * 2} height={81 * 2} className="text-white/90" />

            <div className="flex flex-col items-center gap-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-secondary" aria-hidden="true" />
              </div>

              <div className="flex flex-col gap-3 max-w-sm">
                <h1 className="text-3xl font-semibold text-white tracking-tight">
                  Ha ocurrido un error inesperado
                </h1>
                <p className="text-sm text-white/60 leading-relaxed">
                  Se ha producido un fallo en la aplicación. Puedes intentar recargar la página o
                  volver al inicio.
                </p>
                {error.digest && (
                  <p className="text-xs text-white/40 font-mono mt-1">ref: {error.digest}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Ir al inicio
              </Link>
            </div>
          </div>

          <div className="border-t border-white/10 py-4 flex justify-center">
            <p className="text-xs text-white/30">Marketplace</p>
          </div>
        </div>
      </body>
    </html>
  );
}
