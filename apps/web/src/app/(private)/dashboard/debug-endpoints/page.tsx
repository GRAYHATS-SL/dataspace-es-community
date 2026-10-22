import { redirect } from 'next/navigation';

import DebugEndpointsPageClient from './page.client';

export default function DebugEndpointsPage() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/dashboard');
  }

  return <DebugEndpointsPageClient />;
}
