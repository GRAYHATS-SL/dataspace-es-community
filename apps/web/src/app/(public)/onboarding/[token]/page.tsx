import { notFound } from 'next/navigation';

import Container from '@/components/atoms/Container';
import SectionHeader from '@/components/molecules/SectionHeader';
import { OnboardingForm } from '@/components/organisms/OnboardingForm';
import { isOnboardingTokenConfigured, verifySignedToken } from '@/lib/utils/tokens';

type OnboardingPageProps = {
  params: Promise<{ token: string }>;
};

/** Public onboarding wizard, reachable only through a signed link. */
export default async function OnboardingPage({ params }: Readonly<OnboardingPageProps>) {
  const { token } = await params;

  if (!(await isOnboardingTokenConfigured())) {
    return (
      <SectionHeader
        title="Registro no disponible"
        subtitle="Los enlaces de registro no están configurados en este entorno."
        className="py-16"
      />
    );
  }

  if (!(await verifySignedToken(token))) notFound();

  return (
    <div className="flex flex-col items-center px-6 py-14">
      <Container>
        <OnboardingForm />
      </Container>
    </div>
  );
}
