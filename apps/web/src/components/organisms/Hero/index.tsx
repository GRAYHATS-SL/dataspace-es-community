'use client';

import React from 'react';

import Container from '@/components/atoms/Container';
import LogoPlaceholder from '@/components/atoms/LogoPlaceholder';
import Typography from '@/components/atoms/Typography';
import AccessRequestForm from '@/components/molecules/AccessRequestForm';
import { accessRequestEmail } from '@/lib/services/actions';
import { cn } from '@/lib/utils';

import HeroLogos from './HeroLogos';

/** Props of `Hero`. */
export interface HeroProps {
  className?: string;
  title?: string;
  subtitle?: string;
  showEmailForm?: boolean;
}

/** Hero - Landing hero with title, subtitle and optional access-request form. */
const Hero: React.FC<Readonly<HeroProps>> = ({
  className,
  title = 'Título principal',
  subtitle = 'Descripción breve',
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
          {/* Here you place your trust/certification logo (link + next/image). */}
          <LogoPlaceholder />

          {/* Title and description */}
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

          <HeroLogos />
        </div>
      </Container>
    </section>
  );
};

Hero.displayName = 'Hero';

export default Hero;
