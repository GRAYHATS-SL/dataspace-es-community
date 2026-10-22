'use client';

import { usePathname } from 'next/navigation';

import DashboardFooter from '@/components/organisms/DashboardFooter';
import Footer from '@/components/organisms/Footer';

/**
 * FooterWrapper - Selects the footer by current route
 *
 * @returns {React.ReactElement} `DashboardFooter` or `Footer`.
 */
const FooterWrapper = () => {
  const pathname = usePathname();
  if (pathname.startsWith('/dashboard')) {
    return <DashboardFooter />;
  }
  return <Footer />;
};

export default FooterWrapper;
