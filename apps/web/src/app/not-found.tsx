import Link from 'next/link';

import Typography from '@/components/atoms/Typography';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-24">
      <Typography as="h1" variant="title" className="mb-4 text-primary">
        404 - Página no encontrada
      </Typography>
      <Typography variant="body" className="mb-8 text-gray">
        Lo sentimos, la página que buscas no existe o ha sido movida.
      </Typography>
      <Link
        href="/"
        className="rounded-full bg-primary px-6 py-3 text-white transition-colors hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
