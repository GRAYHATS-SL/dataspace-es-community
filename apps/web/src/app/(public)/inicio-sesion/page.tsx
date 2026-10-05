import Button from '@/components/atoms/Button';
import Card, { CardContent, CardFooter, CardHeader } from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import { startLogin } from '@/lib/services/auth';

const ERROR_MESSAGES: Record<string, string> = {
  session_expired: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  not_configured: 'El inicio de sesión no está configurado. Revisa las variables de entorno.',
  idp_unavailable: 'No se pudo contactar con el proveedor de identidad. Inténtalo más tarde.',
  invalid_request: 'La solicitud de acceso no es válida.',
  invalid_state: 'La solicitud de acceso ha caducado o no es válida. Inténtalo de nuevo.',
  token_exchange_failed: 'No se pudo completar el inicio de sesión. Inténtalo de nuevo.',
  token_missing: 'El proveedor de identidad no devolvió un token de acceso.',
  invalid_token: 'No se pudo verificar el token de acceso.',
};

const DEFAULT_ERROR_MESSAGE = 'Se ha producido un error al iniciar sesión.';

const LOGIN_STEPS = [
  { id: 'continue', text: 'Pulsa «Continuar» para ir a tu proveedor de identidad.' },
  { id: 'credentials', text: 'Inicia sesión con las credenciales de tu cuenta.' },
  { id: 'return', text: 'Volverás automáticamente a la plataforma con la sesión iniciada.' },
] as const;

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: Readonly<LoginPageProps>) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? DEFAULT_ERROR_MESSAGE) : null;

  // Same-size block as the original access code area: holds the OIDC login action.
  const loginContent = errorMessage ? (
    <div
      role="alert"
      className="flex size-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-100 bg-red-50 p-4"
    >
      <Icon name="AlertCircle" size={48} className="text-danger" aria-hidden="true" />
      <Typography variant="small" color="danger" className="text-center">
        {errorMessage}
      </Typography>
      <form action={startLogin}>
        <Button type="submit" variant="primary" size="sm" className="cursor-pointer">
          Reintentar
        </Button>
      </form>
    </div>
  ) : (
    <div className="flex size-56 flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-muted p-2">
      <Icon name="LogIn" size={56} className="text-gray-200" aria-hidden="true" />
      <form action={startLogin}>
        <Button type="submit" variant="primary" size="md" className="cursor-pointer">
          Continuar
        </Button>
      </form>
    </div>
  );

  return (
    <section className="flex min-h-full items-center justify-center py-16">
      <Container size="sm">
        <Card variant="elevated" size="lg" radius="2xl" className="flex flex-col gap-8">
          <CardHeader>
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-primary/10 bg-primary/5 p-4 sm:flex-row">
              <Typography variant="small" color="primary">
                Necesitas una cuenta en el proveedor de identidad para iniciar sesión.
              </Typography>
              <Link href="/" className="inline-flex">
                <Button variant="primary" size="sm" className="shrink-0">
                  Solicitar acceso
                </Button>
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
              <div
                aria-live="polite"
                aria-atomic="true"
                aria-label="Acceso con proveedor de identidad"
                className="flex shrink-0 flex-col items-center justify-center md:order-last"
              >
                {loginContent}
              </div>

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

          <CardFooter className="flex-col gap-1 border-t border-gray-100 pt-5 md:flex-row md:items-center">
            <Icon name="MessageCircle" size={14} className="shrink-0 text-gray" />
            <Typography variant="small" color="gray">
              ¿Tienes problemas para acceder?
            </Typography>
            <Link href="/" variant="primary" size="sm">
              Contacta con el administrador
            </Link>
          </CardFooter>
        </Card>
      </Container>
    </section>
  );
}
