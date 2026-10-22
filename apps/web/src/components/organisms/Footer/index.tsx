'use client';

import Image from 'next/image';
import React from 'react';

import Container from '@/components/atoms/Container';
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

const NAV_SECTIONS: FooterNavSectionConfig[] = [
  {
    title: 'Producto',
    links: [{ href: '/catalogo', label: 'Catálogo' }],
  },
  {
    title: 'Gobernanza',
    links: [
      {
        href: process.env.NEXT_PUBLIC_RULEBOOK_URL ?? '#',
        label: 'Libro de reglas',
      },
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

/**
 * Footer - Public site footer
 *
 * @param {string} [className] - Extra CSS classes.
 */
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
          {/* Filas 1+2 — Logo + texto legal */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="flex flex-row items-center gap-6">
              <MainLogo className="h-auto w-54 md:w-56 lg:w-60 text-primary" />
              <div className="relative h-10 w-40">
                <Image
                  src="/corporate/logo-EDC-color.png"
                  alt="Logo del Espacio de Datos Confiable"
                  fill
                  sizes="(max-width: 768px) 176px, 192px"
                  className="object-contain object-center"
                />
              </div>
            </div>
            <Typography
              variant="small"
              color="gray"
              className="text-center leading-relaxed lg:text-left"
            >
              El proyecto Plataforma dataspace.es (Expediente: TSI-100130-2024-31) ha sido
              financiado por el Ministerio para la Transformación Digital y de la Función Pública y
              por la Unión Europea - NextGenerationEU, en el marco del Plan de Recuperación,
              Transformación y Resiliencia.
            </Typography>
          </div>

          {/* Fila 3 — ENS + enlaces + newsletter */}
          <div className="flex flex-col items-center gap-6 md:gap-8 lg:flex-row lg:items-start lg:gap-8">
            <div className="lg:w-1/4">
              <Image
                src="/corporate/ensLogo.webp"
                alt="Esquema Nacional de Seguridad"
                width={120}
                height={40}
                loading="eager"
                className="h-auto w-32 object-contain"
              />
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
                  Suscríbete para recibir actualizaciones sobre gobernanza de datos.
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

          {/* Fila 4 — Copyright + redes */}
          <div className="flex flex-col items-center justify-between gap-4 border-t border-muted pt-8 md:flex-row md:items-center">
            <Typography variant="small" color="gray">
              © 2026 DataSpace. Todos los derechos reservados.
            </Typography>
            <SocialLinks />
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
