import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Select } from '@/components/atoms/FormSelect';
import Input from '@/components/atoms/Input';
import Typography from '@/components/atoms/Typography';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

import { COUNTRIES } from './constants';

interface Step1OrgDataProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
  register: UseFormRegister<OnboardingFormData>;
}

/** Step1OrgData - Onboarding step 1: organization and contact data. */
export function Step1OrgData({ control, errors, register }: Readonly<Step1OrgDataProps>) {
  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="mb-4 sm:mb-8 text-left">
        <Typography as="h2" variant="title" className="mb-1" color="primary">
          Datos de la Organización
        </Typography>
        <Typography variant="small" color="gray">
          Completa la información básica de tu organización para iniciar el proceso de registro.
        </Typography>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          size="lg"
          label="Nombre de la organización*"
          placeholder="Ej. Mi Organización"
          {...register('organizationName')}
          error={errors.organizationName?.message}
        />
        <Controller
          name="country"
          control={control}
          render={({ field }) => (
            <Select
              label="País*"
              options={COUNTRIES}
              placeholder="Selecciona un país"
              {...field}
              error={errors.country?.message}
            />
          )}
        />
        <div className="sm:col-span-2">
          <Input
            size="lg"
            label="Sitio Web"
            placeholder="www.ejemplo.com"
            prefix="https://"
            {...register('website')}
            error={errors.website?.message}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          size="lg"
          label="Nombre Completo*"
          placeholder="Ej. Nombre Apellido"
          {...register('contactName')}
          error={errors.contactName?.message}
        />
        <Input
          size="lg"
          label="Cargo"
          placeholder="Ej. Responsable técnico"
          {...register('contactPosition')}
          error={errors.contactPosition?.message}
        />
        <Input
          size="lg"
          label="Correo Electrónico*"
          type="email"
          placeholder="nombre@ejemplo.com"
          {...register('contactEmail')}
          error={errors.contactEmail?.message}
        />
        <Input
          size="lg"
          label="Teléfono*"
          type="tel"
          placeholder="+00 000 000 000"
          {...register('contactPhone')}
          error={errors.contactPhone?.message}
        />
      </div>
    </div>
  );
}
