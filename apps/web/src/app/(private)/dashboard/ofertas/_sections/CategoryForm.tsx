'use client';

import { useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import { useCreateCategory, usePatchCategory } from '@/hooks/queries/useCategoryQueries';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { CategoryFormData, categorySchema } from '@/lib/validations/category.schema';
import type { Category } from '@/types/api';

interface CategoryFormProps {
  onClose: () => void;
  editingCategory?: Category | null;
}

const CategoryForm = ({ onClose, editingCategory }: Readonly<CategoryFormProps>) => {
  const createMutation = useCreateCategory();
  const patchMutation = usePatchCategory();
  const isEditing = !!editingCategory;
  const isPending = createMutation.isPending || patchMutation.isPending;

  const pendingLabel = isEditing ? 'Guardando…' : 'Creando…';
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear categoría';
  const submitText = isPending ? pendingLabel : idleLabel;
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <SmartForm<CategoryFormData>
      key={editingCategory?.id ?? 'new'}
      fields={[
        {
          name: 'name',
          type: 'text',
          label: 'Nombre',
          required: true,
          wrapperClassName: 'col-span-2',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
      ]}
      columns={2}
      schema={categorySchema}
      defaultValues={
        isEditing
          ? {
              name: editingCategory.name ?? '',
              description: editingCategory.description ?? '',
            }
          : undefined
      }
      resetOnSubmit={!isEditing}
      onSubmit={async (data) => {
        if (isEditing) {
          await patchMutation.mutateAsync({
            id: editingCategory.id!,
            payload: {
              name: data.name.trim(),
              description: data.description?.trim() || undefined,
            },
          });
        } else {
          await createMutation.mutateAsync({
            name: data.name.trim(),
            description: data.description?.trim() || undefined,
          });
        }
        onClose();
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={submitText}
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
};

export default CategoryForm;
