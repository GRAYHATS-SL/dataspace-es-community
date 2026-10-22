import './globals.css';

import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

// import { TokenDebugButton } from '@/components/debug/TokenDebugButton';
import FooterWrapper from '@/components/organisms/FooterWrapper';
import Header from '@/components/organisms/Header';
import { Providers } from '@/lib/providers';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'DATASPACE.ES | Espacio de datos multisectorial',
  description:
    'DATASPACE.ES es un ecosistema basado en espacios de datos dirigido a fomentar la compartición, uso y negocio con datos, basado en principios de soberanía, interoperabilidad, legalidad y seguridad.',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'DATASPACE.ES | Espacio de datos multisectorial',
    description:
      'DATASPACE.ES es un ecosistema basado en espacios de datos dirigido a fomentar la compartición, uso y negocio con datos, basado en principios de soberanía, interoperabilidad, legalidad y seguridad.',
    url: siteUrl,
    siteName: 'DataSpace',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/og_dataspace.webp',
        width: 1200,
        height: 630,
        alt: 'DATASPACE.ES | Espacio de datos multisectorial',
      },
    ],
  },
  alternates: {
    canonical: `${siteUrl}/`,
  },
  keywords: [
    'DataSpace',
    'Marketplace de datos',
    'Espacios de datos',
    'España',
    'Europa',
    'Plataforma de datos',
    'Soberanía de datos',
    'ENS',
    'Privacidad',
    'Seguridad',
    'Economía de datos',
  ],
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'DATASPACE.ES',
  generator: 'Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased font-sans`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Saltar al contenido principal
            </a>
            <Header />
            <main id="main-content" role="main" className="flex-1 bg-muted" tabIndex={-1}>
              {children}
            </main>
            {/* {process.env.NODE_ENV !== 'production' && <TokenDebugButton />} */}

            <FooterWrapper />
          </div>
        </Providers>
      </body>
    </html>
  );
}
