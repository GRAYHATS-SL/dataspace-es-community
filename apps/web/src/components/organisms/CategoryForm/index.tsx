'use client';

import { useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import { useCreateCategory, usePatchCategory } from '@/hooks/queries';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { type CategoryFormData, categorySchema } from '@/lib/validations/category.schema';
import type { Category, NewCategory } from '@/types/api';

/** Props of `CategoryForm`. */
export interface CategoryFormProps {
  onClose: () => void;
  onSuccess?: (category: Category) => void;
  editingCategory?: Category | null;
}

/** Maps the form values to the category payload sent to the API. */
function buildCategoryPayload(data: CategoryFormData): NewCategory {
  // Here you define your business logic (parent category, root flag, lifecycle status...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
  };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(editing?: Category | null): Partial<CategoryFormData> {
  if (!editing) {
    // Here you define your business logic (default values for new categories).
    return {};
  }
  return {
    name: editing.name ?? '',
    description: editing.description ?? '',
  };
}

/** Create/edit form of a category. */
const CategoryForm = ({ onClose, onSuccess, editingCategory }: Readonly<CategoryFormProps>) => {
  const createMutation = useCreateCategory();
  const patchMutation = usePatchCategory();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingCategory?.id;
  const isPending = createMutation.isPending || patchMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear categoría';

  const handleSubmit = async (data: CategoryFormData) => {
    setSubmitError(null);
    const payload = buildCategoryPayload(data);
    const category =
      isEditing && editingCategory.id
        ? await patchMutation.mutateAsync({ id: editingCategory.id, payload })
        : await createMutation.mutateAsync(payload);
    onSuccess?.(category);
    onClose();
  };

  return (
    <SmartForm<CategoryFormData>
      key={editingCategory?.id ?? 'new'}
      fields={[
        { name: 'name', type: 'text', label: 'Nombre', required: true, wrapperClassName: 'col-span-2' },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
      ]}
      defaultValues={getDefaultValues(editingCategory)}
      columns={2}
      schema={categorySchema}
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

export default CategoryForm;
