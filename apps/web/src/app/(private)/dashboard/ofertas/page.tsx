import { isAdminSession } from '@/lib/services/queries/_utils';

import OfertasPageClient from './page.client';

// Aliases for old or hand-written links to the real id of each tab.
const TAB_ALIASES = new Map([
  ['productos', 'especificaciones-producto'],
  ['recursos', 'especificaciones-recurso'],
  ['servicios', 'especificaciones-servicio'],
]);

export default async function OfertasPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tab?: string }>;
}>) {
  const { tab } = await searchParams;
  const activeTab = tab ? (TAB_ALIASES.get(tab) ?? tab) : 'catalogos';
  return <OfertasPageClient activeTab={activeTab} isAdmin={await isAdminSession()} />;
}
