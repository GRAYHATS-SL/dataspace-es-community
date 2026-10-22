import type { ReactNode } from 'react';

import { redirectUnlessProvider } from '@/lib/utils/providerGuard';

export default async function PublicarLayout({ children }: Readonly<{ children: ReactNode }>) {
  await redirectUnlessProvider();
  return children;
}
