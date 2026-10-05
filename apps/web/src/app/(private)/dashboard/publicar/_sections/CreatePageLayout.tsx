import Link from 'next/link';
import type { ReactNode } from 'react';

import Container from '@/components/atoms/Container';
import SectionHeader from '@/components/molecules/SectionHeader';

/** Props of `CreatePageLayout`. */
export interface CreatePageLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/** Shared layout of the `publicar/crear-*` pages (header, form card and back link). */
export default function CreatePageLayout({
  title,
  subtitle,
  children,
}: Readonly<CreatePageLayoutProps>) {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader title={title} subtitle={subtitle} className="px-4" />
      </section>
      <section className="py-10">
        <Container>
          <div className="bg-white border rounded-lg p-6 shadow-sm flex flex-col gap-4 max-w-md mx-auto">
            {children}
          </div>
          <div className="mt-8 text-center">
            <Link href="/dashboard/publicar" className="text-gray-600">
              Volver a publicar
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
