'use client';

import { useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import {
  useCreateResourceSpecification,
  usePatchResourceSpecification,
} from '@/hooks/queries/useResourceSpecificationQueries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  ResourceSpecCharacteristicFormData,
  ResourceSpecificationFormData,
  resourceSpecificationSchema,
  UpdateResourceSpecificationFormData,
  updateResourceSpecificationSchema,
} from '@/lib/validations/resourceSpecification.schema';
import type { ResourceSpecCharacteristic, ResourceSpecification } from '@/types/api';

const USER_CHARS_ID = 'userCharacteristics';

const buildUserCharsChar = (
  items: ResourceSpecCharacteristicFormData[],
): ResourceSpecCharacteristic | null => {
  const filtered = items.filter((c) => c.name.trim());
  if (filtered.length === 0) return null;
  // Broker rejects nested arrays — encode N items as indexed flat keys in a single object value.
  const value: Record<string, string> = { count: String(filtered.length) };
  filtered.forEach((c, i) => {
    value[`${i}_name`] = c.name;
    if (c.valueType) value[`${i}_valueType`] = c.valueType;
    if (c.value?.trim()) value[`${i}_value`] = c.value.trim();
    if (c.description?.trim()) value[`${i}_description`] = c.description.trim();
  });
  return {
    id: USER_CHARS_ID,
    name: 'Características',
    valueType: 'object',
    resourceSpecCharacteristicValue: [{ isDefault: true, value }],
  };
};

const extractUserCharsFromSpec = (
  spec: Pick<ResourceSpecification, 'resourceSpecCharacteristic'>,
): ResourceSpecCharacteristicFormData[] => {
  // Resource catalog broker strips the `id` field on storage — fall back to name.
  const char = spec.resourceSpecCharacteristic?.find(
    (c) => c.id === USER_CHARS_ID || c.name === 'Características',
  );
  const value = (char?.resourceSpecCharacteristicValue?.[0]?.value ?? {}) as Record<string, string>;
  const count = Number.parseInt(value.count ?? '0', 10);
  if (!count) return [];
  return Array.from({ length: count }, (_, i) => ({
    name: value[`${i}_name`] ?? '',
    description: value[`${i}_description`] ?? '',
    valueType: value[`${i}_valueType`] as ResourceSpecCharacteristicFormData['valueType'],
    value: value[`${i}_value`] ?? '',
    configurable: false,
    isUnique: false,
  })).filter((c) => c.name);
};

interface ResourceSpecFormProps {
  onClose: () => void;
  editingResourceSpec?: ResourceSpecification | null;
}

const ResourceSpecForm = ({ onClose, editingResourceSpec }: Readonly<ResourceSpecFormProps>) => {
  const isEditing = !!editingResourceSpec;
  const createMutation = useCreateResourceSpecification();
  const patchMutation = usePatchResourceSpecification();
  const isPending = createMutation.isPending || patchMutation.isPending;
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isEditing) {
    return (
      <SmartForm<UpdateResourceSpecificationFormData>
        key={editingResourceSpec.id}
        fields={[
          {
            name: 'name',
            type: 'text',
            label: 'Nombre',
            required: true,
            wrapperClassName: 'col-span-1',
          },
          {
            name: 'lifecycleStatus',
            type: 'select',
            label: 'Estado',
            placeholder: 'Selecciona un estado',
            wrapperClassName: 'col-span-1',
            options: LIFECYCLE_OPTIONS as unknown as { label: string; value: string }[],
          },
          // { name: 'category', type: 'text', label: 'Categoría', wrapperClassName: 'col-span-1' },
          {
            name: 'description',
            type: 'textarea',
            label: 'Descripción',
            wrapperClassName: 'col-span-2',
            props: { rows: 2 },
          },
          {
            name: 'resourceSpecCharacteristic-section',
            type: 'characteristics-array' as const,
            fieldName: 'resourceSpecCharacteristic',
            wrapperClassName: 'col-span-2',
          },
        ]}
        columns={2}
        schema={updateResourceSpecificationSchema}
        defaultValues={{
          name: editingResourceSpec.name ?? '',
          // category: editingResourceSpec.category ?? '',
          description: editingResourceSpec.description ?? '',
          lifecycleStatus:
            editingResourceSpec.lifecycleStatus as UpdateResourceSpecificationFormData['lifecycleStatus'],
          resourceSpecCharacteristic: extractUserCharsFromSpec(editingResourceSpec),
        }}
        resetOnSubmit={false}
        onSubmit={async (data) => {
          const charsChar = buildUserCharsChar(data.resourceSpecCharacteristic ?? []);
          await patchMutation.mutateAsync({
            id: editingResourceSpec.id!,
            payload: {
              name: data.name?.trim() || undefined,
              // category: data.category?.trim() || undefined,
              description: data.description?.trim() || undefined,
              lifecycleStatus: data.lifecycleStatus,
              ...(charsChar && { resourceSpecCharacteristic: [charsChar] }),
            },
          });
          onClose();
        }}
        onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
        submitText={isPending ? 'Guardando…' : 'Guardar cambios'}
        loading={isPending}
        onCancel={onClose}
      >
        {submitError && (
          <Typography variant="small" className="text-danger" role="alert">
            {submitError}
          </Typography>
        )}
      </SmartForm>
    );
  }

  return (
    <SmartForm<ResourceSpecificationFormData>
      fields={[
        {
          name: 'name',
          type: 'text',
          label: 'Nombre',
          required: true,
          wrapperClassName: 'col-span-1',
        },
        {
          name: 'lifecycleStatus',
          type: 'select',
          label: 'Estado',
          placeholder: 'Selecciona un estado',
          wrapperClassName: 'col-span-1',
          options: LIFECYCLE_OPTIONS as unknown as { label: string; value: string }[],
        },
        // { name: 'category', type: 'text', label: 'Categoría', wrapperClassName: 'col-span-1' },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
        {
          name: 'resourceSpecCharacteristic-section',
          type: 'characteristics-array' as const,
          fieldName: 'resourceSpecCharacteristic',
          wrapperClassName: 'col-span-2',
        },
      ]}
      columns={2}
      schema={resourceSpecificationSchema}
      onSubmit={async (data) => {
        const charsChar = buildUserCharsChar(data.resourceSpecCharacteristic ?? []);
        const spec = await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
          lifecycleStatus: data.lifecycleStatus,
          // category: data.category,
        });

        if (charsChar && spec.id) {
          await patchMutation.mutateAsync({
            id: spec.id,
            payload: { resourceSpecCharacteristic: [charsChar] },
          });
        }
        onClose();
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={isPending ? 'Creando…' : 'Crear especificación'}
      loading={isPending}
      onCancel={onClose}
      resetOnSubmit
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
