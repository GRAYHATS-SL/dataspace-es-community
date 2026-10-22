'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import AccessRequestForm from '@/components/molecules/AccessRequestForm';
import { accessRequestEmail } from '@/lib/services/actions';
import { cn } from '@/lib/utils';

import HeroLogos from './HeroLogos';

export interface HeroProps {
  className?: string;
  title?: string;
  subtitle?: string;
  // badgeText?: string;
  showEmailForm?: boolean;
}

/**
 * Hero - Landing page hero section
 *
 * @param {string} [className] - Extra CSS classes.
 * @param {string} [title] - Main title.
 * @param {string} [subtitle] - Subtitle.
 * @param {boolean} [showEmailForm=false] - Whether to show the access request form.
 */
const Hero: React.FC<Readonly<HeroProps>> = ({
  className,
  title = 'Título del Hero',
  subtitle = 'Descripción del Hero',
  // badgeText = 'Badge del Hero',
  showEmailForm = false,
}) => {
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleEmailSubmit = async (email: string) => {
    setErrorMessage(null);
    const result = await accessRequestEmail(email);
    if (!result.ok) {
      setErrorMessage(result.error ?? 'Error al enviar la solicitud.');
      throw new Error(result.error);
    }
  };

  return (
    <section
      id="heroBlock"
      className={cn(
        'corporate-gradient py-24 pt-36 relative flex justify-center text-balance md:py-24 md:pt-40',
        className,
      )}
    >
      <Container size="xl" padding>
        <div className="relative z-10 flex flex-col gap-10 items-center text-center">
          <Link
            href="https://cred.digital.gob.es./lista-de-confianza/que-es-lista-de-confianza.html"
            className="relative h-10 w-40 md:h-12 md:w-48"
          >
            <Image
              src="/corporate/logo-EDC-white.png"
              alt="Logo del Espacio de Datos Confiable"
              fill
              sizes="(max-width: 768px) 176px, 192px"
              className="object-contain object-center"
            />
          </Link>

          {/* Título y descripción */}
          <div className="flex flex-col gap-6">
            <Typography as="h1" variant="hero" color="white" className="max-w-4xl text-pretty">
              {title}
            </Typography>

            <Typography
              as="p"
              color="white"
              className="mx-auto max-w-2xl text-base text-pretty text-white/90 md:text-lg lg:text-xl"
            >
              {subtitle}
            </Typography>
          </div>

          {/* Email Form */}
          {showEmailForm && (
            <div className="flex flex-col items-center gap-2 w-full">
              <AccessRequestForm onSubmit={handleEmailSubmit} />
              {errorMessage && (
                <Typography variant="small" className="text-danger text-center">
                  {errorMessage}
                </Typography>
              )}
            </div>
          )}

          {/* Logos corporativos */}
          <HeroLogos />
        </div>
      </Container>
    </section>
  );
};

Hero.displayName = 'Hero';

export default Hero;
