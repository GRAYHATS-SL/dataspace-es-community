import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';

/** Loading state of the onboarding route. */
const OnboardingLoading = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Container>
        <div className="mb-8 flex justify-center space-x-2">
          <div className="bg-gray-light h-2 w-2 animate-pulse rounded-full [animation-delay:-0.3s]" />
          <div className="bg-gray-light h-2 w-2 animate-pulse rounded-full [animation-delay:-0.15s]" />
          <div className="bg-gray-light h-2 w-2 animate-pulse rounded-full" />
        </div>
        <div className="text-center">
          <Typography as="h1" variant="title" color="gray" className="mb-2 animate-pulse">
            Verificando el enlace de registro
          </Typography>
        </div>
      </Container>
    </div>
  );
};

export default OnboardingLoading;
