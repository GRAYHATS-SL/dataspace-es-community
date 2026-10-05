import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import Card from '@/components/atoms/Card';
import { Checkbox } from '@/components/atoms/FormCheckbox';
import { Textarea } from '@/components/atoms/FormTextarea';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

import { SCHEDULING_URL } from './constants';

interface Step4LegalProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  meetingConfirmed: boolean;
  register: UseFormRegister<OnboardingFormData>;
}

/** Step4Legal - Onboarding step 4: legal acceptances, optional scheduling widget and comments. */
export function Step4Legal({
  control,
  errors,
  meetingConfirmed,
  register,
}: Readonly<Step4LegalProps>) {
  const hasScheduling = SCHEDULING_URL.length > 0;
  let sectionNumber = 1;

  return (
    <>
      <Card variant="default" size="lg" radius="xl" className="p-4 sm:p-8">
        <div className="mb-3 sm:mb-6 flex items-baseline gap-3">
          <Typography variant="title">{sectionNumber++}</Typography>
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
                      Acuerdo marco
                    </a>
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
                      Política de gobernanza
                    </a>
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
                      Política de uso de datos
                    </a>
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

      {hasScheduling && (
        <Card variant="default" size="lg" radius="xl" className="p-4 sm:p-8">
          <div className="mb-3 sm:mb-6 flex items-baseline gap-3">
            <Typography variant="title">{sectionNumber++}</Typography>
            <Typography as="h3" variant="subtitle">
              Reunión inicial
            </Typography>
          </div>
          {meetingConfirmed ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <Icon name="CheckCircle" size={48} className="text-success" />
              <Typography as="h4" variant="subtitle">
                ¡Cita agendada correctamente!
              </Typography>
              <Typography variant="small" color="gray">
                Recibirás una confirmación con los detalles de la reunión.
              </Typography>
            </div>
          ) : (
            <iframe
              src={SCHEDULING_URL}
              title="Agendar reunión"
              className="w-full rounded-lg border-0"
              style={{ minWidth: '320px', height: 'clamp(500px, 80vh, 700px)' }}
              loading="lazy"
            />
          )}
        </Card>
      )}

      <Card variant="default" size="lg" radius="xl" className="p-4 sm:p-8">
        <div className="mb-3 sm:mb-6 flex items-baseline gap-3">
          <Typography variant="title">{sectionNumber}</Typography>
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
    </>
  );
}
