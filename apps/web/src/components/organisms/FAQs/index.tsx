'use client';

import React, { useCallback, useState } from 'react';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import FaqItem from '@/components/molecules/FaqItem';
import { cn } from '@/lib/utils';

import TutorialSteps from './TutorialSteps';

type FaqCategory = 'todos' | 'proveedores' | 'consumidores';

interface FaqData {
  id: string;
  category: FaqCategory;
  question: string;
  answer: React.ReactNode;
}

const CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'consumidores', label: 'Consumidores' },
];

// Here you define your business logic (the questions and answers of your platform).
const FAQ_DATA: FaqData[] = [
  {
    id: 'que-es',
    category: 'todos',
    question: '¿Qué es esta plataforma?',
    answer:
      'Un marketplace donde las organizaciones publican, descubren y contratan productos y servicios. Sustituye este texto por la descripción de tu plataforma.',
  },
  {
    id: 'como-registrarse',
    category: 'todos',
    question: '¿Cómo me registro?',
    answer:
      'Solicita acceso desde la página de inicio con tu correo electrónico. Recibirás un enlace para completar el registro de tu organización.',
  },
  {
    id: 'como-publicar',
    category: 'proveedores',
    question: '¿Cómo publico un producto?',
    answer: (
      <TutorialSteps
        steps={[
          {
            title: 'Crea un catálogo',
            description: 'Agrupa tus productos en uno o varios catálogos desde el panel de control.',
          },
          {
            title: 'Define la especificación',
            description: 'Describe las características técnicas del producto o servicio.',
          },
          {
            title: 'Publica la oferta',
            description: 'Asocia precio y condiciones de uso y publícala en el catálogo.',
          },
        ]}
      />
    ),
  },
  {
    id: 'gestionar-ofertas',
    category: 'proveedores',
    question: '¿Puedo modificar o retirar una oferta publicada?',
    answer: 'Sí. Desde el panel de control puedes editar el estado de tus ofertas en cualquier momento.',
  },
  {
    id: 'como-contratar',
    category: 'consumidores',
    question: '¿Cómo contrato un producto?',
    answer: (
      <TutorialSteps
        steps={[
          {
            title: 'Explora el catálogo',
            description: 'Busca y filtra las ofertas disponibles sin necesidad de registrarte.',
          },
          {
            title: 'Revisa la oferta',
            description: 'Consulta descripción, condiciones de uso y precio.',
          },
          {
            title: 'Realiza la orden',
            description: 'Inicia sesión, crea la orden y sigue su estado desde tu panel.',
          },
        ]}
      />
    ),
  },
  {
    id: 'acuerdos',
    category: 'consumidores',
    question: '¿Qué es un acuerdo?',
    answer:
      'El documento que recoge las condiciones pactadas entre proveedor y consumidor para el uso de un producto.',
  },
];

/** Props of `FAQs`. */
export interface FAQsProps {
  className?: string;
}

/** FAQs - Frequently asked questions section with profile tabs and single-open accordion. */
const FAQs: React.FC<Readonly<FAQsProps>> = ({ className }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('todos');

  const handleToggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const handleCategoryChange = useCallback((category: FaqCategory) => {
    setActiveCategory(category);
    setOpenId(null);
  }, []);

  const filteredFaqs =
    activeCategory === 'todos'
      ? FAQ_DATA
      : FAQ_DATA.filter((faq) => faq.category === activeCategory || faq.category === 'todos');

  return (
    <section className={cn('bg-white py-16 md:py-24', className)} aria-labelledby="faqs-heading">
      <Container size="xl" padding>
        <div className="flex flex-col gap-8 md:gap-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Typography as="h2" id="faqs-heading" variant="title" color="primary">
              Preguntas frecuentes
            </Typography>
            <Typography
              variant="body"
              color="gray"
              className="mx-auto max-w-2xl text-base text-pretty lg:text-lg"
            >
              Resolvemos las dudas más habituales de proveedores y consumidores.
            </Typography>
          </div>

          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label="Filtrar preguntas por perfil de usuario"
              className="flex gap-1.5 rounded-full bg-muted p-1.5"
            >
              {CATEGORIES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === id}
                  onClick={() => handleCategoryChange(id)}
                  className={cn(
                    'rounded-full px-5 py-2 text-sm font-medium transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-secondary focus-visible:ring-offset-2',
                    activeCategory === id
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray hover:text-primary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl">
            {filteredFaqs.length === 0 ? (
              <Typography variant="body" color="gray" className="py-10 text-center">
                No hay preguntas para este perfil todavía.
              </Typography>
            ) : (
              <div className="divide-y divide-transparent">
                {filteredFaqs.map((faq) => (
                  <FaqItem
                    key={faq.id}
                    id={faq.id}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openId === faq.id}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default FAQs;
