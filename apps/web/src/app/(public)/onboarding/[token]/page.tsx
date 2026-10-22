import { notFound } from 'next/navigation';

import Container from '@/components/atoms/Container';
import { OnboardingForm } from '@/components/organisms/OnboardingForm';
import { verifySignedToken } from '@/lib/utils/tokens';

type OnboardingPageProps = {
  params: Promise<{ token: string }>;
};

const OnboardingPage = async ({ params }: Readonly<OnboardingPageProps>) => {
  const { token } = await params;
  const isValid = await verifySignedToken(token);

  if (!isValid) {
    notFound();
  }

  return (
    <div className="flex flex-col items-center px-6 py-14">
      <Container>
        <OnboardingForm />
      </Container>
    </div>
  );
};

export default OnboardingPage;
