import React from 'react';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import FeatureCard from '@/components/molecules/FeatureCard';
import { cn } from '@/lib/utils';

/**
 * FeaturesSection - Section showing the DataSpace features
 *
 * @example
 * <FeaturesSection />
 */

export interface FeaturesSectionProps {
  className?: string;
}

const FEATURES = [
  {
    id: 'catalogo-unificado',
    icon: 'Database',
    title: 'Catálogo unificado',
    description:
      'Accede a datasets de múltiples fuentes con metadatos estandarizados bajo normativas europeas e internacionales.',
  },
  {
    id: 'seguridad-avanzada',
    icon: 'Lock',
    title: 'Seguridad avanzada',
    description:
      'Encriptación de extremo a extremo, computación confidencial y protocolos de acceso granular basados en roles.',
  },
  {
    id: 'colaboracion-publico-privada',
    icon: 'Users',
    title: 'Colaboración público-privada',
    description:
      'Espacios de trabajo seguros (data clean rooms) para proyectos conjuntos de alto impacto social y económico.',
  },
  {
    id: 'cumplimiento-normativo',
    icon: 'Scale',
    title: 'Cumplimiento normativo',
    description:
      'Totalmente alineado con la Data Governance Act y GDPR, garantizando la trazabilidad y auditoría permanente.',
  },
];

const FeaturesSection: React.FC<Readonly<FeaturesSectionProps>> = ({ className }) => {
  return (
    <section className={cn('bg-muted py-16 md:py-24', className)}>
      <Container size="xl" padding>
        <div className="flex flex-col gap-8 md:gap-14">
          {/* Header */}
          <div className="flex flex-col gap-4 items-center text-center">
            <Typography as="h2" variant="title" color="primary">
              Arquitectura de confianza
            </Typography>
            <Typography
              variant="body"
              color="gray"
              className="mx-auto max-w-2xl text-base text-pretty md:text-lg"
            >
              Diseñado para garantizar la soberanía de los datos y facilitar la colaboración
              interorganizacional sin comprometer la privacidad.
            </Typography>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4 grid-cols-1 sm:gap-6 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard
                key={feature.id}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FeaturesSection;
