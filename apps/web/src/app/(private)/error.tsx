'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';

export default function PrivateError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Ha ocurrido un error</h1>
        <p className="text-muted-foreground max-w-md">
          Se ha producido un error inesperado en esta sección. Puedes reintentar o volver al
          dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">Referencia: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-md hover:opacity-90 transition-opacity"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
