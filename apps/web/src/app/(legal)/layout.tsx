import '@/styles/legal.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import Container from '@/components/atoms/Container';

export const metadata: Metadata = {
  title: 'Información legal',
  description: 'Condiciones, políticas y aviso legal de la plataforma.',
};

/** Layout shared by the MDX legal pages. */
export default function LegalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="corporate-gradient min-h-screen">
      <Container>
        <article className="legal-content w-full py-10 md:py-28">{children}</article>
      </Container>
    </div>
  );
}
