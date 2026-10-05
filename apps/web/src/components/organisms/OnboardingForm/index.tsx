'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { type SubmitErrorHandler, useForm } from 'react-hook-form';

import Card from '@/components/atoms/Card';
import Typography from '@/components/atoms/Typography';
import { ProgressBar } from '@/components/molecules/ProgressBar';
import countriesData from '@/data/countries.json';
import { sendOnboardingEmail } from '@/lib/services/actions';
import { type OnboardingFormData, onboardingSchema } from '@/lib/validations/onboarding.schema';

import { SCHEDULING_URL, STEP_LABELS, STEP_VALIDATION_FIELDS, USE_CASES } from './constants';
import { Step1OrgData } from './Step1OrgData';
import { Step2Role } from './Step2Role';
import { Step3UseCase } from './Step3UseCase';
import { Step4Legal } from './Step4Legal';
import { Step5Summary } from './Step5Summary';
import { StepNavigation } from './StepNavigation';

const TOTAL_STEPS = STEP_LABELS.length;

/**
 * Returns the booking reference when a scheduling-widget message means "event scheduled".
 */
function getScheduledEventRef(event: MessageEvent): string | null {
  let expectedOrigin = '';
  try {
    expectedOrigin = new URL(SCHEDULING_URL).origin;
  } catch {
    return null;
  }
  if (event.origin !== expectedOrigin) return null;
  // Here you define your business logic (message format of your scheduling provider).
  const data: unknown = event.data;
  if (typeof data === 'object' && data !== null && 'scheduledEventRef' in data) {
    const ref = (data as { scheduledEventRef: unknown }).scheduledEventRef;
    return typeof ref === 'string' ? ref : null;
  }
  return null;
}

/** OnboardingForm - Five-step public onboarding wizard that submits the registration by email. */
export function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [meetingConfirmed, setMeetingConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      organizationName: '',
      country: '',
      website: '',
      contactName: '',
      contactPosition: '',
      contactEmail: '',
      contactPhone: '',
      role: 'consumer',
      useCase: '',
      dataFormats: [],
      acceptTerms: false,
      acceptPrivacy: false,
      acceptProcessing: false,
      comments: '',
      meetingDate: '',
      meetingTime: '',
    },
    shouldUnregister: false,
  });

  const watchedData = watch();

  useEffect(() => {
    if (!SCHEDULING_URL) return;
    const handleSchedulingMessage = (event: MessageEvent) => {
      const ref = getScheduledEventRef(event);
      if (!ref) return;
      setMeetingConfirmed(true);
      setValue('meetingDate', ref);
    };
    globalThis.addEventListener('message', handleSchedulingMessage);
    return () => globalThis.removeEventListener('message', handleSchedulingMessage);
  }, [setValue]);

  const nextStep = async () => {
    const isValid = await trigger(STEP_VALIDATION_FIELDS[currentStep]);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = (data: OnboardingFormData) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await sendOnboardingEmail(data).catch(() => ({
        ok: false as const,
        error: 'Error inesperado al enviar el formulario.',
      }));
      if (!result.ok) {
        setSubmitError(`No se pudo enviar el registro: ${result.error}`);
        return;
      }
      router.push('/');
    });
  };

  const onError: SubmitErrorHandler<OnboardingFormData> = () => {
    setSubmitError('El formulario contiene errores. Revisa los campos marcados.');
  };

  const selectedCountry = countriesData.find(
    (country) => country.code.toLowerCase() === watchedData.country,
  );
  const selectedUseCase = USE_CASES.find((u) => u.value === watchedData.useCase);

  return (
    <div className="mx-auto w-full">
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} stepLabels={STEP_LABELS} />

      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <Card variant="default" size="xl" radius="xl" className="overflow-hidden p-6 md:p-10">
          <div hidden={currentStep !== 1}>
            <Step1OrgData register={register} control={control} errors={errors} />
          </div>

          <div hidden={currentStep !== 2}>
            <Step2Role control={control} errors={errors} />
          </div>

          <div hidden={currentStep !== 3}>
            <Step3UseCase control={control} errors={errors} />
          </div>

          <div hidden={currentStep !== 4} className="space-y-5 sm:space-y-8">
            <Step4Legal
              control={control}
              errors={errors}
              meetingConfirmed={meetingConfirmed}
              register={register}
            />
          </div>

          <div hidden={currentStep !== 5}>
            <Step5Summary
              watchedData={watchedData}
              selectedCountry={selectedCountry}
              selectedUseCase={selectedUseCase}
              meetingConfirmed={meetingConfirmed}
              onEditStep={setCurrentStep}
            />
          </div>

          {submitError && (
            <Typography variant="small" color="danger" role="alert" className="mt-6 text-center">
              {submitError}
            </Typography>
          )}

          <StepNavigation
            currentStep={currentStep}
            isPending={isPending}
            onPrev={prevStep}
            onNext={nextStep}
            onSubmit={handleSubmit(onSubmit, onError)}
          />
        </Card>
      </form>
    </div>
  );
}
