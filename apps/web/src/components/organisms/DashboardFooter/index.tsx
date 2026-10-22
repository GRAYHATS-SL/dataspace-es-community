'use client';

import Image from 'next/image';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';

/** DashboardFooter - Simplified footer for `/dashboard` routes */
const DashboardFooter = () => {
  return (
    <footer className="border-t border-muted bg-white py-5">
      <Container>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Typography variant="small" color="gray">
              © 2026 DataSpace. Todos los derechos reservados.
            </Typography>
            <ul className="flex items-center gap-6">
              {/* foundedLogoBlue: 3781×919 — ratio 4.11 → 40×164px display */}
              <li className="relative h-9 w-41">
                <Image
                  src="/corporate/foundedLogoBlue.webp"
                  alt="Financiado por la Unión Europea — Next Generation EU"
                  fill
                  sizes="164px"
                  className="object-contain"
                />
              </li>
              {/* MTDFPGob: 4459×1070 — ratio 4.17 → 36×150px display */}
              <li className="relative h-9 w-37.5">
                <Image
                  src="/corporate/MTDFPGob.svg"
                  alt="Ministerio para la Transformación Digital y de la Función Pública"
                  fill
                  sizes="150px"
                  className="object-contain"
                />
              </li>
              {/* prtrLogoColor: 1920×1080 — ratio 1.78 (16:9) → 64×114px display */}
              <li className="relative h-16 w-28.5">
                <Image
                  src="/corporate/prtrLogoColor.webp"
                  alt="Plan de Recuperación, Transformación y Resiliencia"
                  fill
                  sizes="114px"
                  className="object-contain"
                />
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default DashboardFooter;
