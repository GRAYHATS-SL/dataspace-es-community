'use client';

import { usePathname } from 'next/navigation';

import DashboardFooter from '@/components/organisms/DashboardFooter';
import Footer from '@/components/organisms/Footer';

/**
 * FooterWrapper - Picks the footer for the current route.
 *
 * `DashboardFooter` on `/dashboard/*`, `Footer` elsewhere.
 */
const FooterWrapper = () => {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) {
    return <DashboardFooter />;
  }
  return <Footer />;
};

export default FooterWrapper;
