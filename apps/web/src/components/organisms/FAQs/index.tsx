'use client';

import React, { useCallback, useState } from 'react';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import FaqItem from '@/components/molecules/FaqItem';
import { cn } from '@/lib/utils';

import TutorialSteps from './TutorialSteps';

/**
 * FAQs - Frequently asked questions and step-by-step tutorials
 *
 * @example
 * <FAQs />
 */

// ─── Data ───────────────────────────────────────────────────────────────────

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

const FAQ_DATA: FaqData[] = [
  // ── General ──────────────────────────────────────────────────────────────
  {
    id: 'que-es-dataspace',
    category: 'todos',
    question: '¿Qué es Dataspace.es y para qué sirve?',
    answer:
      'Dataspace.es es el espacio de datos multisectorial de referencia en España. Es una plataforma segura que permite a organizaciones —tanto del sector público como privado— publicar, descubrir y consumir servicios de datos bajo estrictos estándares de soberanía, interoperabilidad y seguridad (certificación ENS Alto). Facilita la colaboración interorganizacional y el establecimiento de acuerdos de uso de datos de forma transparente y conforme a la normativa europea (Data Governance Act, RGPD).',
  },
  {
    id: 'cumplimiento-normativo',
    category: 'todos',
    question: '¿Con qué normativas europeas cumple la plataforma?',
    answer:
      'Dataspace.es cumple íntegramente con el Reglamento General de Protección de Datos (RGPD/GDPR), la Data Governance Act (DGA) y el Data Act. Además, está certificada bajo el Esquema Nacional de Seguridad (ENS) en nivel Alto, lo que garantiza la trazabilidad, auditoría continua y protección de todos los activos de datos gestionados. Todos los intercambios de datos se apoyan en protocolos de identidad descentralizada (EUDI Wallet) conformes al marco europeo eIDAS 2.0.',
  },

  // ── Providers ───────────────────────────────────────────────────────────
  {
    id: 'como-publicar-datos',
    category: 'proveedores',
    question: '¿Cómo publico mis datos o servicios como proveedor?',
    answer: (
      <TutorialSteps
        steps={[
          {
            title: 'Solicita la adhesión',
            description:
              'Rellena el formulario de la página de inicio con el correo de tu organización. Recibirás un enlace de onboarding para completar el registro como entidad proveedora.',
          },
          {
            title: 'Crea tu Catálogo de Productos',
            description:
              'Desde el dashboard, accede a "Catálogo" y crea tu primer catálogo. Define el nombre, descripción y ciclo de vida. El catálogo agrupa todos tus conjuntos de datos y servicios.',
          },
          {
            title: 'Define las Categorías',
            description:
              'Organiza tu catálogo creando categorías temáticas (ej. Movilidad, Salud, Finanzas). Esto facilita la búsqueda a los consumidores y aplica la taxonomía multisectorial del dataspace.',
          },
          {
            title: 'Publica una Oferta de Datos',
            description:
              'Crea un Product Offering con su especificación técnica (formatos, endpoints, características), condiciones de uso y, opcionalmente, precio. Asocia la oferta a tu catálogo y categorías.',
          },
          {
            title: 'Activa y gestiona acuerdos',
            description:
              'Publica la oferta en estado "Activo" para que sea visible en el marketplace. Recibirás notificaciones cuando consumidores soliciten acceso y podrás gestionar los acuerdos desde el panel.',
          },
        ]}
      />
    ),
  },
  {
    id: 'formatos-compatibles',
    category: 'proveedores',
    question: '¿Qué formatos de datos son compatibles con la plataforma?',
    answer:
      'Dataspace.es soporta un amplio espectro de formatos: datos estructurados (JSON, CSV, XML, XLSX), datos geoespaciales (GeoJSON, KML, Shapefile), datos en tiempo real (MQTT, API REST, GraphQL) y datos semiestructurados. Los metadatos se publican siguiendo el estándar DCAT-AP para garantizar la interoperabilidad con otros espacios de datos europeos y el catálogo nacional.',
  },
  {
    id: 'control-acceso',
    category: 'proveedores',
    question: '¿Cómo controlo quién puede acceder a mis datos publicados?',
    answer:
      'Dispones de control granular sobre el acceso mediante políticas de uso definidas en cada Product Offering: puedes establecer acceso abierto, acceso bajo demanda con aprobación manual, acceso por suscripción de pago o acceso restringido a un conjunto de organizaciones autorizadas. El sistema de identidad basado en credenciales verificables (EUDI Wallet) garantiza que solo las entidades con las credenciales correctas puedan consumir tus datos.',
  },
  {
    id: 'retirar-dataset',
    category: 'proveedores',
    question: '¿Puedo modificar o retirar un dataset ya publicado?',
    answer:
      'Sí. Puedes cambiar el estado de ciclo de vida de cualquier oferta (Activo → En revisión → Retirado) en cualquier momento desde el panel de Catálogo. Antes de retirar una oferta con acuerdos activos, la plataforma te mostrará los consumidores afectados para que puedas notificarles. Los metadatos y el historial de acuerdos se conservan con fines de auditoría conforme a la normativa vigente.',
  },

  // ── Consumers ──────────────────────────────────────────────────────────
  {
    id: 'como-acceder-datos',
    category: 'consumidores',
    question: '¿Cómo encuentro y accedo a los datos que necesito?',
    answer: (
      <TutorialSteps
        steps={[
          {
            title: 'Explora el catálogo público',
            description:
              'Usa el buscador de la página principal para filtrar datasets por palabra clave, sector, formato o proveedor. Puedes explorar el catálogo sin necesidad de tener cuenta.',
          },
          {
            title: 'Consulta los detalles de la oferta',
            description:
              'Accede a la ficha de cualquier dataset para ver metadatos completos: descripción, esquema, formato, condiciones de uso, precio y datos de contacto del proveedor.',
          },
          {
            title: 'Solicita el acceso',
            description:
              'Si el dataset requiere aprobación, haz clic en "Solicitar acceso" e inicia sesión con tu EUDI Wallet. Recibirás una notificación cuando el proveedor apruebe tu solicitud.',
          },
          {
            title: 'Firma el acuerdo de datos',
            description:
              'Revisa y acepta las condiciones de uso del acuerdo de datos generado automáticamente. El acuerdo queda registrado de forma auditable en la plataforma.',
          },
          {
            title: 'Consume los datos',
            description:
              'Una vez activo el acuerdo, accede a las credenciales de integración (API key, endpoint, token) desde tu panel de "Mis pedidos" e integra los datos en tus sistemas.',
          },
        ]}
      />
    ),
  },
  {
    id: 'acuerdos-datos',
    category: 'consumidores',
    question: '¿Cómo funcionan los acuerdos de datos y qué implican?',
    answer:
      'Un acuerdo de datos (Data Agreement) es el contrato digital entre proveedor y consumidor que define las condiciones de uso, finalidad permitida, duración del acceso y obligaciones de cada parte. Se genera automáticamente a partir de las condiciones publicadas por el proveedor y se firma mediante credenciales verificables. El acuerdo queda inmutablemente registrado en la plataforma, garantizando trazabilidad y cumplimiento normativo para ambas partes.',
  },
  {
    id: 'integracion-sistemas',
    category: 'consumidores',
    question: '¿Puedo integrar los datos directamente con mis propios sistemas?',
    answer:
      'Sí. Una vez activo el acuerdo, recibes credenciales de acceso (API key o token Bearer) para consumir los datos directamente desde tus aplicaciones mediante REST API o conexión directa al endpoint del proveedor. La plataforma proporciona documentación técnica por oferta y ejemplos de integración en los principales lenguajes (Python, JavaScript, Java). También puedes descargar ficheros puntuales desde el panel si el proveedor lo permite.',
  },
  {
    id: 'costes-facturacion',
    category: 'consumidores',
    question: '¿Cómo se gestionan los costes y la facturación de los datos?',
    answer:
      'Los datasets con coste muestran su precio claramente en la ficha de la oferta (precio por llamada, por volumen o por suscripción mensual/anual). Al aceptar el acuerdo, autorizas el cargo según el modelo de precios establecido. La facturación se gestiona mensualmente y puedes consultar el detalle de consumo y facturas en tu panel de "Facturación". Muchos datasets de organismos públicos son gratuitos y de acceso abierto bajo licencia open data.',
  },
];

// ─── Main component ─────────────────────────────────────────────────────

export interface FAQsProps {
  className?: string;
}

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
          {/* Encabezado de sección */}
          <div className="flex flex-col items-center gap-4 text-center">
            <Typography as="h2" id="faqs-heading" variant="title" color="primary">
              Preguntas frecuentes
            </Typography>
            <Typography
              variant="body"
              color="gray"
              className="mx-auto max-w-2xl text-base text-pretty lg:text-lg"
            >
              Resolvemos las dudas más habituales de proveedores y consumidores que se incorporan a
              Dataspace.es, con tutoriales paso a paso para empezar en minutos.
            </Typography>
          </div>

          {/* Filtros por perfil */}
          <div className="flex justify-center">
            <div
              role="tablist"
              aria-label="Filtrar preguntas por perfil de usuario"
              className="flex gap-1.5 rounded-full bg-muted p-1.5"
            >
              {CATEGORIES.map(({ id, label }) => (
                <button
                  key={id}
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

          {/* Lista de preguntas */}
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
