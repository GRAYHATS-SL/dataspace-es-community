import './globals.css';

import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

import FooterWrapper from '@/components/organisms/FooterWrapper';
import Header from '@/components/organisms/Header';
import { Providers } from '@/lib/providers';

const fontSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
});

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Plantilla de marketplace basada en las TM Forum Open APIs.',
  ...(process.env.NEXT_PUBLIC_APP_URL
    ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) }
    : {}),
  robots: {
    index: true,
    follow: true,
  },
  applicationName: 'Marketplace',
  generator: 'Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased font-sans`}>
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
            <FooterWrapper />
          </div>
        </Providers>
      </body>
    </html>
  );
}
