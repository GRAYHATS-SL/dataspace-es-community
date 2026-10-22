import '@/styles/legal.css';

import { Metadata } from 'next';
import { ReactNode } from 'react';

import Container from '@/components/atoms/Container';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'Información Legal y Normativa | DATASPACE.ES',
  description:
    'Consulta la información legal y normativa de DATASPACE.ES, incluyendo política de gobernanza, acuerdo marco de uso, política de privacidad, aviso legal y política de cookies.',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: `${siteUrl}/legal`,
  },
  openGraph: {
    title: 'Información Legal y Normativa | DATASPACE.ES',
    description:
      'Marco legal y normativo de DATASPACE.ES: gobernanza, condiciones de uso, privacidad, cookies y cumplimiento regulatorio.',
    url: `${siteUrl}/legal`,
    siteName: 'DATASPACE.ES',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/og_dataspace.webp',
        width: 1200,
        height: 630,
        alt: 'Información Legal y Normativa | DATASPACE.ES',
      },
    ],
  },
  keywords: [
    'Información legal',
    'Normativa',
    'Gobernanza',
    'Privacidad',
    'Cookies',
    'Aviso legal',
    'Condiciones de uso',
    'DataSpace',
    'Cumplimiento normativo',
    'DataSpace',
    'Marketplace de datos',
    'Espacios de datos',
    'España',
    'Europa',
    'Plataforma de datos',
    'Soberanía de datos',
  ],
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'DATASPACE.ES',
  generator: 'Next.js',
};
export default function LegalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="corporate-gradient min-h-screen">
      <Container>
        <article className="legal-content w-full py-10 md:py-28">{children}</article>
      </Container>
    </div>
  );
}
