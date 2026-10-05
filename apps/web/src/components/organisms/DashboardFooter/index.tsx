'use client';

import Container from '@/components/atoms/Container';
import LogoPlaceholder from '@/components/atoms/LogoPlaceholder';
import Typography from '@/components/atoms/Typography';

/**
 * DashboardFooter - Compact footer for `/dashboard` routes.
 */
const DashboardFooter = () => {
  return (
    <footer className="border-t border-muted bg-white py-5">
      <Container>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Typography variant="small" color="gray">
              © 2026 Tu organización. Software libre bajo licencia AGPL-3.0.
            </Typography>
            {/* Here you place your institutional logos (`next/image` with `fill` + `object-contain`). */}
            <ul className="flex items-center gap-6">
              <li>
                <LogoPlaceholder tone="dark" />
              </li>
              <li>
                <LogoPlaceholder tone="dark" />
              </li>
              <li>
                <LogoPlaceholder tone="dark" />
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default DashboardFooter;
