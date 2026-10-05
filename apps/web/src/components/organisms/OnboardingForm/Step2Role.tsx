import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import Typography from '@/components/atoms/Typography';
import RadioSelector from '@/components/molecules/RadioSelector';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';

import { ROLE_OPTIONS } from './constants';

interface Step2RoleProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

/** Step2Role - Onboarding step 2: role selection. */
export function Step2Role({ control, errors }: Readonly<Step2RoleProps>) {
  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="mb-4 sm:mb-8 text-left">
        <Typography as="h2" variant="title" className="mb-1" color="primary">
          Rol en la plataforma
        </Typography>
        <Typography variant="small" color="gray">
          Selecciona el perfil que mejor describa tu actividad dentro de la plataforma. El rol
          determina tus permisos en el portal y el tipo de validaciones que aplican.
        </Typography>
      </div>
      <Controller
        name="role"
        control={control}
        render={({ field }) => (
          <RadioSelector options={ROLE_OPTIONS} value={field.value} onChange={field.onChange} />
        )}
      />
      {errors.role && (
        <Typography variant="small" className="text-danger mt-2">
          {errors.role.message}
        </Typography>
      )}
    </div>
  );
}
