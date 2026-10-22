import Script from 'next/script';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import Card from '@/components/atoms/Card';
import { Checkbox } from '@/components/atoms/FormCheckbox';
import { Textarea } from '@/components/atoms/FormTextarea';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

import { CALENDLY_URL } from './constants';

interface Step4LegalProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  meetingConfirmed: boolean;
  register: UseFormRegister<OnboardingFormData>;
}

/**
 * Step4Legal - Onboarding step 4: legal acceptances and call scheduling
 *
 * @param {Control<OnboardingFormData>} control - Form control.
 * @param {FieldErrors<OnboardingFormData>} errors - Validation errors.
 * @param {boolean} meetingConfirmed - Whether the meeting is scheduled.
 * @param {UseFormRegister<OnboardingFormData>} register - Form `register` function.
 */
export function Step4Legal({
  control,
  errors,
  meetingConfirmed,
  register,
}: Readonly<Step4LegalProps>) {
  return (
    <>
      <Card variant="default" size="lg" radius="xl" className="p-4 sm:p-8">
        <div className="mb-3 sm:mb-6 flex items-baseline gap-3">
          <Typography variant="title">1</Typography>
          <Typography as="h3" variant="subtitle">
            Aceptaciones Legales
          </Typography>
        </div>
        <div className="space-y-4">
          <Controller
            name="acceptTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                label={
                  <span>
                    He leído y entiendo el{' '}
                    <a href="/acuerdo-marco" className="text-primary">
                      Acuerdo Marco de Participación
                    </a>
                    {/*
                     */}
                    .
                  </span>
                }
                checked={field.value}
                onChange={field.onChange}
                error={errors.acceptTerms?.message}
              />
            )}
          />
          <Controller
            name="acceptPrivacy"
            control={control}
            render={({ field }) => (
              <Checkbox
                label={
                  <span>
                    He leído y entiendo la{' '}
                    <a href="/politica-gobernanza" className="text-primary">
                      Política de Gobernanza
                    </a>
                    {/*
                     */}
                    .
                  </span>
                }
                checked={field.value}
                onChange={field.onChange}
                error={errors.acceptPrivacy?.message}
              />
            )}
          />
          <Controller
            name="acceptProcessing"
            control={control}
            render={({ field }) => (
              <Checkbox
                label={
                  <span>
                    He leído y entiendo la{' '}
                    <a href="/politica-uso-datos" className="text-primary">
                      Política de Uso de Datos
                    </a>
                    {/*
                     */}
                    .
                  </span>
                }
                checked={field.value}
                onChange={field.onChange}
                error={errors.acceptProcessing?.message}
              />
            )}
          />
        </div>
      </Card>

      <Card variant="default" size="lg" radius="xl" className="p-4 sm:p-8">
        <div className="mb-3 sm:mb-6 flex items-baseline gap-3">
          <Typography variant="title">2</Typography>
          <Typography as="h3" variant="subtitle">
            Llamada de Descubrimiento
          </Typography>
        </div>
        {meetingConfirmed ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Icon name="CheckCircle" size={48} className="text-success" />
            <Typography as="h4" variant="subtitle">
              ¡Cita agendada correctamente!
            </Typography>
            <Typography variant="small" color="gray">
              Recibirás una confirmación por correo electrónico con los detalles de la reunión.
            </Typography>
          </div>
        ) : (
          <div
            className="calendly-inline-widget"
            data-url={CALENDLY_URL}
            style={{ minWidth: '320px', height: 'clamp(500px, 80vh, 700px)' }}
          />
        )}
      </Card>

      <Card variant="default" size="lg" radius="xl" className="p-4 sm:p-8">
        <div className="mb-3 sm:mb-6 flex items-baseline gap-3">
          <Typography variant="title">3</Typography>
          <Typography as="h3" variant="subtitle">
            Información Adicional
          </Typography>
        </div>
        <Textarea
          label="¿Algo más que debamos saber?"
          placeholder="Escribe aquí tus comentarios o dudas sobre el proceso..."
          rows={4}
          {...register('comments')}
        />
      </Card>
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
    </>
  );
}
