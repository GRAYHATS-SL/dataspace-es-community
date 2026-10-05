'use client';

import { useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import { useCreateResourceSpecification, usePatchResourceSpecification } from '@/hooks/queries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  type ResourceSpecCharacteristicFormData,
  type ResourceSpecificationFormData,
  resourceSpecificationSchema,
} from '@/lib/validations/resourceSpecification.schema';
import type {
  NewResourceSpecification,
  ResourceSpecCharacteristic,
  ResourceSpecification,
} from '@/types/api';

/** Props of `ResourceSpecForm`. */
export interface ResourceSpecFormProps {
  onClose: () => void;
  onSuccess?: (spec: ResourceSpecification) => void;
  editingResourceSpec?: ResourceSpecification | null;
}

/** Maps the characteristic rows of the form to the API characteristics. */
function buildResourceCharacteristics(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _items: ResourceSpecCharacteristicFormData[],
): ResourceSpecCharacteristic[] {
  // Here you define your business logic (how characteristic rows are stored in the API).
  return [];
}

/** Reads the characteristic rows of an existing specification back into the form. */
function extractResourceCharacteristics(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _spec: ResourceSpecification,
): ResourceSpecCharacteristicFormData[] {
  // Here you define your business logic (inverse of `buildResourceCharacteristics`).
  return [];
}

/** Maps the form values to the resource specification payload. */
function buildResourceSpecPayload(
  data: ResourceSpecificationFormData,
): Partial<NewResourceSpecification> {
  const characteristics = buildResourceCharacteristics(data.resourceSpecCharacteristic ?? []);
  // Here you define your business logic (default values, derived fields...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    lifecycleStatus: data.lifecycleStatus,
    ...(characteristics.length > 0 && { resourceSpecCharacteristic: characteristics }),
  };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(
  spec?: ResourceSpecification | null,
): Partial<ResourceSpecificationFormData> {
  if (!spec) return { resourceSpecCharacteristic: [] };
  return {
    name: spec.name ?? '',
    description: spec.description ?? '',
    lifecycleStatus: LIFECYCLE_OPTIONS.find((o) => o.value === spec.lifecycleStatus)?.value,
    resourceSpecCharacteristic: extractResourceCharacteristics(spec),
  };
}

/** Create/edit form of a resource specification with its characteristics. */
const ResourceSpecForm = ({
  onClose,
  onSuccess,
  editingResourceSpec,
}: Readonly<ResourceSpecFormProps>) => {
  const createMutation = useCreateResourceSpecification();
  const patchMutation = usePatchResourceSpecification();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingResourceSpec?.id;
  const isPending = createMutation.isPending || patchMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear especificación';

  const handleSubmit = async (data: ResourceSpecificationFormData) => {
    setSubmitError(null);
    const payload = buildResourceSpecPayload(data);
    const spec =
      isEditing && editingResourceSpec.id
        ? await patchMutation.mutateAsync({ id: editingResourceSpec.id, payload })
        : await createMutation.mutateAsync(payload);
    onSuccess?.(spec);
    onClose();
  };

  return (
    <SmartForm<ResourceSpecificationFormData>
      key={editingResourceSpec?.id ?? 'new'}
      fields={[
        { name: 'name', type: 'text', label: 'Nombre', required: true, wrapperClassName: 'col-span-1' },
        {
          name: 'lifecycleStatus',
          type: 'select',
          label: 'Estado',
          placeholder: 'Selecciona un estado',
          wrapperClassName: 'col-span-1',
          options: LIFECYCLE_OPTIONS,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
        {
          name: 'resourceSpecCharacteristic-section',
          type: 'characteristics-array',
          fieldName: 'resourceSpecCharacteristic',
          wrapperClassName: 'col-span-2',
        },
      ]}
      columns={2}
      schema={resourceSpecificationSchema}
      defaultValues={getDefaultValues(editingResourceSpec)}
      onSubmit={handleSubmit}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={isPending ? 'Guardando…' : idleLabel}
      loading={isPending}
      onCancel={onClose}
      resetOnSubmit={!isEditing}
    >
      {submitError && (
        <Typography variant="small" className="text-danger" role="alert">
          {submitError}
        </Typography>
      )}
    </SmartForm>
  );
};

export default ResourceSpecForm;
