'use client';

import React from 'react';

import Container from '@/components/atoms/Container';
import LogoPlaceholder from '@/components/atoms/LogoPlaceholder';
import MainLogo from '@/components/atoms/MainLogo';
import Typography from '@/components/atoms/Typography';
import EmailForm from '@/components/molecules/EmailForm';
import FooterNavSection, { type FooterNavLink } from '@/components/molecules/FooterNavSection';
import SocialLinks from '@/components/molecules/SocialLinks';
import { sendNewsletterSubscriptionEmail } from '@/lib/services/actions';
import { cn } from '@/lib/utils';

interface FooterNavSectionConfig {
  title: string;
  links: FooterNavLink[];
}

/** External terms/rules document. The link is hidden when unset. */
const TERMS_DOCUMENT_URL = process.env.NEXT_PUBLIC_TERMS_DOCUMENT_URL ?? '';

/** Public repository with the corresponding source code (required by AGPL-3.0 §13). */
const SOURCE_CODE_URL = process.env.NEXT_PUBLIC_SOURCE_CODE_URL ?? '';

const NAV_SECTIONS: FooterNavSectionConfig[] = [
  {
    title: 'Producto',
    links: [
      { href: '/catalogo', label: 'Catálogo' },
      ...(SOURCE_CODE_URL ? [{ href: SOURCE_CODE_URL, label: 'Código fuente' }] : []),
    ],
  },
  {
    title: 'Gobernanza',
    links: [
      ...(TERMS_DOCUMENT_URL ? [{ href: TERMS_DOCUMENT_URL, label: 'Libro de reglas' }] : []),
      { href: '/politica-gobernanza', label: 'Política de Gobernanza' },
      { href: '/politica-uso-datos', label: 'Política de Uso de Datos' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/politica-privacidad', label: 'Política de Privacidad' },
      { href: '/aviso-legal', label: 'Aviso Legal' },
      { href: '/politica-cookies', label: 'Política de Cookies' },
    ],
  },
];

export interface FooterProps {
  className?: string;
}

/** Footer - Public footer (logo, navigation, newsletter, social links). */
const Footer: React.FC<Readonly<FooterProps>> = ({ className }) => {
  const handleEmailSubmit = async (email: string) => {
    const result = await sendNewsletterSubscriptionEmail(email);
    if (!result.ok) throw new Error(result.error);
  };

  return (
    <footer
      className={cn('border-t border-muted bg-white py-16', className)}
      aria-label="Pie de página"
    >
      <Container>
        <div className="flex flex-col gap-8 md:gap-12">
          {/* Rows 1+2 — logo + legal text */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="flex flex-row items-center gap-6">
              <MainLogo className="h-auto w-54 md:w-56 lg:w-60 text-primary" />
              {/* Here you place your partner/trust logo (next/image). */}
              <LogoPlaceholder tone="dark" />
            </div>
            <Typography
              variant="small"
              color="gray"
              className="text-center leading-relaxed lg:text-left"
            >
              Aquí va el texto legal o de financiación de tu proyecto.
            </Typography>
          </div>

          {/* Row 3 — certification + links + newsletter */}
          <div className="flex flex-col items-center gap-6 md:gap-8 lg:flex-row lg:items-start lg:gap-8">
            <div className="lg:w-1/4">
              {/* Here you place your certification logo (next/image). */}
              <LogoPlaceholder tone="dark" />
            </div>

            <div className="flex w-full flex-col items-center justify-between gap-8 md:flex-row md:items-start md:gap-12 lg:gap-16 lg:items-start">
              <div className="flex flex-row items-start gap-6 sm:gap-12">
                {NAV_SECTIONS.map((section) => (
                  <FooterNavSection
                    key={section.title}
                    title={section.title}
                    links={section.links}
                  />
                ))}
              </div>

              <section
                aria-labelledby="footer-newsletter-heading"
                className=" flex w-full max-w-sm flex-col items-center  gap-6 lg:items-start"
              >
                <Typography id="footer-newsletter-heading" as="p" variant="caption" color="primary">
                  Newsletter
                </Typography>
                <Typography variant="small" color="gray-light" className="text-center lg:text-left">
                  Suscríbete para recibir actualizaciones de la plataforma.
                </Typography>
                <EmailForm
                  size="compact"
                  submitText="Suscribirse"
                  placeholder="Tu correo electrónico"
                  variant="footer"
                  onSubmit={handleEmailSubmit}
                />
              </section>
            </div>
          </div>

          {/* Row 4 — copyright + social */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-muted pt-8 md:flex-row md:items-center">
            <Typography variant="small" color="gray">
              © 2026 Tu organización. Software libre bajo licencia AGPL-3.0.
            </Typography>
            <SocialLinks />
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
