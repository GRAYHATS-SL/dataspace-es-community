import React from 'react';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import FeatureCard from '@/components/molecules/FeatureCard';
import { cn } from '@/lib/utils';

/** Props of `FeaturesSection`. */
export interface FeaturesSectionProps {
  className?: string;
}

// Here you define your business logic (the value propositions of your platform).
const FEATURES = [
  {
    id: 'catalogo',
    icon: 'Database',
    title: 'Catálogo unificado',
    description: 'Reúne productos y servicios de distintos proveedores con metadatos homogéneos.',
  },
  {
    id: 'seguridad',
    icon: 'Lock',
    title: 'Acceso seguro',
    description: 'Autenticación estándar y control de acceso por roles para cada recurso.',
  },
  {
    id: 'colaboracion',
    icon: 'Users',
    title: 'Colaboración',
    description: 'Proveedores y consumidores acuerdan condiciones de uso de forma transparente.',
  },
  {
    id: 'trazabilidad',
    icon: 'Scale',
    title: 'Trazabilidad',
    description: 'Órdenes, acuerdos e inventario quedan registrados y consultables.',
  },
];

/** FeaturesSection - Landing section showing the platform features as a grid of `FeatureCard`. */
const FeaturesSection: React.FC<Readonly<FeaturesSectionProps>> = ({ className }) => {
  return (
    <section className={cn('bg-muted py-16 md:py-24', className)}>
      <Container size="xl" padding>
        <div className="flex flex-col gap-8 md:gap-14">
          <div className="flex flex-col gap-4 items-center text-center">
            <Typography as="h2" variant="title" color="primary">
              Características principales
            </Typography>
            <Typography
              variant="body"
              color="gray"
              className="mx-auto max-w-2xl text-base text-pretty md:text-lg"
            >
              Describe aquí en una frase la propuesta de valor de tu plataforma.
            </Typography>
          </div>

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
