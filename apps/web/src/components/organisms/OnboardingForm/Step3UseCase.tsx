import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Select } from '@/components/atoms/FormSelect';
import Typography from '@/components/atoms/Typography';
import { DataFormatBadgeSelector } from '@/components/molecules/FormDataFormatSelector/DataFormatBadgeSelector';
import type { OnboardingFormData } from '@/lib/validations/onboarding.schema';
import type { BadgeItem } from '@/types/badge';

import { DATA_FORMATS, USE_CASES } from './constants';

interface Step3UseCaseProps {
  control: Control<OnboardingFormData>;
  errors: FieldErrors<OnboardingFormData>;
}

/** Step3UseCase - Onboarding step 3: main use case and data formats of interest. */
export function Step3UseCase({ control, errors }: Readonly<Step3UseCaseProps>) {
  return (
    <div className="space-y-5 sm:space-y-8">
      <div className="mb-4 sm:mb-8 text-left">
        <Typography as="h2" variant="title" className="mb-1" color="primary">
          Personaliza tu entorno de trabajo
        </Typography>
        <Typography variant="small" color="gray">
          Cuéntanos cómo planeas utilizar la plataforma para que podamos ofrecerte las herramientas
          adecuadas.
        </Typography>
      </div>

      <Controller
        name="useCase"
        control={control}
        render={({ field }) => (
          <Select
            label="Caso de uso principal"
            description="Selecciona el caso de uso que mejor describa cómo planeas utilizar los datos y servicios disponibles en la plataforma."
            options={USE_CASES}
            placeholder="Selecciona una opción..."
            {...field}
            error={errors.useCase?.message}
          />
        )}
      />

      <div>
        <Controller
          name="dataFormats"
          control={control}
          render={({ field }) => (
            <DataFormatBadgeSelector
              items={DATA_FORMATS as BadgeItem[]}
              selectedItems={field.value || []}
              onChange={field.onChange}
            />
          )}
        />
        {errors.dataFormats && (
          <Typography variant="small" className="text-danger mt-2">
            {errors.dataFormats.message}
          </Typography>
        )}
      </div>
    </div>
  );
}
