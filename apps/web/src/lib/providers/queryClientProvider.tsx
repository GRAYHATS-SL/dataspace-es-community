'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { GC_TIME, STALE_TIME } from '@/lib/constants/queryConfig';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME.CATALOG,
            gcTime: GC_TIME.DEFAULT,
            retry: (failureCount, error) => {
              if (error instanceof Error && /HTTP 40[14]/.test(error.message)) {
                return false;
              }
              return IS_PRODUCTION && failureCount < 3;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
</QueryClientProvider>
  );
}
