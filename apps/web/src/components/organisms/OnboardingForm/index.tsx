'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { SubmitErrorHandler, useForm } from 'react-hook-form';

import Card from '@/components/atoms/Card';
import { ProgressBar } from '@/components/molecules/ProgressBar';
import countriesData from '@/data/countries.json';
import { sendOnboardingEmail } from '@/lib/services/actions';
import { getCalendlyOrigin, getCalendlyScheduledEventUri } from '@/lib/utils/calendlyEvent';
import { type OnboardingFormData, onboardingSchema } from '@/lib/validations/onboarding.schema';

import { CALENDLY_URL, STEP_LABELS, STEP_VALIDATION_FIELDS, USE_CASES } from './constants';
import { Step1OrgData } from './Step1OrgData';
import { Step2Role } from './Step2Role';
import { Step3UseCase } from './Step3UseCase';
import { Step4Legal } from './Step4Legal';
import { Step5Summary } from './Step5Summary';
import { StepNavigation } from './StepNavigation';

function handleSendResult(result: { ok: boolean; error?: string }, onSuccess: () => void) {
  if (!result.ok) {
    alert('Error al enviar el correo: ' + (result.error ?? 'Error desconocido'));
    return;
  }
  onSuccess();
}

/** OnboardingForm - 5-step public onboarding wizard */
export function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [meetingConfirmed, setMeetingConfirmed] = useState(false);
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
      country: 'ES',
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
    const calendlyOrigin = getCalendlyOrigin(CALENDLY_URL);
    const handleCalendlyEvent = (e: MessageEvent) => {
      if (e.origin !== calendlyOrigin) return;
      const eventUri = getCalendlyScheduledEventUri(e, calendlyOrigin);
      if (eventUri === null) return;
      setMeetingConfirmed(true);
      setValue('meetingDate', eventUri);
    };
    window.addEventListener('message', handleCalendlyEvent);
    return () => window.removeEventListener('message', handleCalendlyEvent);
  }, [setValue]);

  const validateCurrentStep = () => {
    const fields = Object.prototype.hasOwnProperty.call(STEP_VALIDATION_FIELDS, currentStep)
      ? STEP_VALIDATION_FIELDS[currentStep as keyof typeof STEP_VALIDATION_FIELDS]
      : undefined;
    return trigger(fields);
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = (data: OnboardingFormData) => {
    startTransition(async () => {
      const result = await sendOnboardingEmail(data).catch(() => ({
        ok: false as const,
        error: 'Error inesperado al enviar el formulario.',
      }));
      handleSendResult(result, () => router.push('/'));
    });
  };

  const onError: SubmitErrorHandler<OnboardingFormData> = () => {
    alert('El formulario contiene errores. Por favor, revisa los campos marcados.');
  };

  const selectedCountry = countriesData.find(
    (country) => country.code.toLowerCase() === watchedData.country,
  );
  const selectedUseCase = USE_CASES.find((u) => u.value === watchedData.useCase);

  return (
    <div className="mx-auto w-full">
      <ProgressBar currentStep={currentStep} totalSteps={5} stepLabels={STEP_LABELS} />

      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <Card variant="default" size="xl" radius="xl" className="overflow-hidden p-6 md:p-10">
          {/* Paso 1 */}
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Step1OrgData register={register} control={control} errors={errors} />
          </div>

          {/* Paso 2 */}
          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            <Step2Role control={control} errors={errors} />
          </div>

          {/* Paso 3 */}
          <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
            <Step3UseCase control={control} errors={errors} />
          </div>

          {/* Paso 4 */}
          <div
            style={{ display: currentStep === 4 ? 'block' : 'none' }}
            className="space-y-5 sm:space-y-8"
          >
            <Step4Legal
              control={control}
              errors={errors}
              meetingConfirmed={meetingConfirmed}
              register={register}
            />
          </div>

          {/* Paso 5 */}
          <div style={{ display: currentStep === 5 ? 'block' : 'none' }}>
            <Step5Summary
              watchedData={watchedData}
              selectedCountry={selectedCountry}
              selectedUseCase={selectedUseCase}
              meetingConfirmed={meetingConfirmed}
              onEditStep={setCurrentStep}
            />
          </div>

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
