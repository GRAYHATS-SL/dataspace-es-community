'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import Button from '@/components/atoms/Button';
import Card, { CardContent, CardFooter, CardHeader } from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import { useVerifierQR } from '@/hooks/useVerifierQR';
import { useVerifierWebSocket } from '@/hooks/useVerifierWebSocket';
import { getLoginErrorMessage } from '@/lib/utils/loginErrors';

const LOGIN_STEPS = [
  {
    id: 'wallet',
    text: (
      <>
        Inicia sesión en una <strong>Lissi Wallet</strong> o aplicación compatible.
      </>
    ),
  },
  {
    id: 'qr',
    text: 'Escanea el código QR.',
  },
  {
    id: 'credential',
    text: 'Selecciona la credencial obtenida tras el proceso de registro.',
  },
] as const;

const LoginErrorNotice = () => {
  const message = getLoginErrorMessage(useSearchParams().get('error'));
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4"
    >
      <Icon name="AlertCircle" size={16} className="mt-0.5 shrink-0 text-red-500" />
      <Typography variant="small" color="danger">
        {message}
      </Typography>
    </div>
  );
};

const LoginPage = () => {
  const { qrImageSrc, isLoading, isError, state } = useVerifierQR();
  useVerifierWebSocket(state);

  let qrContent: React.ReactNode;
  if (isLoading) {
    qrContent = (
      <div className="flex size-56 animate-pulse items-center justify-center rounded-xl border border-dashed border-gray-200 bg-muted">
        <Icon name="QrCode" size={56} className="text-gray-200" aria-hidden="true" />
        <span className="sr-only">Generando código QR de acceso...</span>
      </div>
    );
  } else if (isError || !qrImageSrc) {
    qrContent = (
      <div className="flex size-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-100 bg-red-50 p-4">
        <Icon name="QrCode" size={48} className="text-danger" aria-hidden="true" />
        <Typography variant="small" color="danger" className="text-center">
          No se pudo cargar el QR. Recarga la página; si persiste, contacta con soporte.
        </Typography>
      </div>
    );
  } else {
    qrContent = (
      <Image
        src={qrImageSrc}
        alt="Código QR para acceder con tu wallet"
        width={224}
        height={224}
        className="rounded-xl border border-gray-200 bg-muted p-2"
        loading="eager"
      />
    );
  }

  return (
    <section className="flex min-h-full items-center justify-center py-16">
      <Container size="sm">
        <Card variant="elevated" size="lg" radius="2xl" className="flex flex-col gap-8">
          <Suspense>
            <LoginErrorNotice />
          </Suspense>

          {/* Aviso de onboarding previo */}
          <CardHeader>
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-primary/10 bg-primary/5 p-4 sm:flex-row">
              <Typography variant="small" color="primary">
                Tu organización debe estar adherida al sistema para que puedas iniciar sesión.
              </Typography>
              <Link href="/" className="inline-flex">
                <Button variant="primary" size="sm" className="shrink-0">
                  Solicitar adhesión
                </Button>
              </Link>
            </div>
          </CardHeader>

          {/* QR + Instrucciones */}
          <CardContent>
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
              {/* QR primero en móvil — derecha en desktop */}
              <div
                aria-live="polite"
                aria-atomic="true"
                aria-label="Estado del código QR de acceso"
                className="flex shrink-0 flex-col items-center justify-center md:order-last"
              >
                {qrContent}
              </div>

              {/* Instrucciones */}
              <div className="flex flex-col gap-6">
                <Typography as="h1" variant="subtitle" color="primary">
                  Instrucciones de acceso
                </Typography>
                <ol className="flex flex-col gap-5">
                  {LOGIN_STEPS.map((step, index) => (
                    <li key={step.id} className="flex items-start gap-4">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <Typography
                        variant="body"
                        color="gray"
                        className="pt-0.5 text-sm leading-snug"
                      >
                        {step.text}
                      </Typography>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </CardContent>

          {/* Pie: soporte */}
          <CardFooter className="flex-col gap-1 border-t border-gray-100 pt-5 md:flex-row md:items-center">
            <Icon name="MessageCircle" size={14} className="shrink-0 text-gray" />
            <Typography variant="small" color="gray">
              ¿Tienes problemas para acceder?
            </Typography>
            <Link href="/soporte" variant="primary" size="sm">
              Soporte al cliente
            </Link>
          </CardFooter>
        </Card>
      </Container>
    </section>
  );
};

export default LoginPage;
