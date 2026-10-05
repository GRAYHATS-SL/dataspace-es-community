'use client';

import { useMemo, useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import {
  useCreateCatalog,
  useLaunchedCategories,
  usePatchCatalog,
  useSetCatalogCategories,
} from '@/hooks/queries';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { type CatalogFormData, catalogSchema } from '@/lib/validations/catalog.schema';
import type { Catalog, NewCatalog } from '@/types/api';

/** Props of `CatalogForm`. */
export interface CatalogFormProps {
  onClose: () => void;
  onSuccess?: (catalog: Catalog) => void;
  editingCatalog?: Catalog | null;
}

/** Maps the form values to the catalog payload sent to the API. */
function buildCatalogPayload(data: CatalogFormData, editing?: Catalog | null): NewCatalog {
  // Here you define your business logic (default version, catalog type, owner party...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    version: editing?.version,
  };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(editing?: Catalog | null): Partial<CatalogFormData> {
  if (!editing) {
    // Here you define your business logic (default values for new catalogs).
    return {};
  }
  return {
    name: editing.name ?? '',
    description: editing.description ?? '',
    category: editing.category?.[0]?.id ?? '',
  };
}

/** Create/edit form of a catalog, with its category assignment. */
const CatalogForm = ({ onClose, onSuccess, editingCatalog }: Readonly<CatalogFormProps>) => {
  const createMutation = useCreateCatalog();
  const patchMutation = usePatchCatalog();
  const setCategoriesMutation = useSetCatalogCategories();
  const categoriesQuery = useLaunchedCategories();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingCatalog?.id;
  const isPending =
    createMutation.isPending || patchMutation.isPending || setCategoriesMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear catálogo';

  const categoryOptions = useMemo(
    () =>
      (categoriesQuery.data ?? [])
        .map((c) => ({ label: c.name ?? c.id ?? '', value: c.id ?? '' }))
        .filter((o) => o.value),
    [categoriesQuery.data],
  );

  const handleSubmit = async (data: CatalogFormData) => {
    setSubmitError(null);
    const payload = buildCatalogPayload(data, editingCatalog);
    const catalog =
      isEditing && editingCatalog.id
        ? await patchMutation.mutateAsync({ id: editingCatalog.id, payload })
        : await createMutation.mutateAsync(payload);

    const initialCategory = editingCatalog?.category?.[0]?.id ?? '';
    const selectedCategory = data.category ?? '';
    if (catalog.id && selectedCategory !== initialCategory) {
      await setCategoriesMutation.mutateAsync({
        id: catalog.id,
        categoryIds: selectedCategory ? [selectedCategory] : [],
      });
    }
    onSuccess?.(catalog);
    onClose();
  };

  return (
    <SmartForm<CatalogFormData>
      key={editingCatalog?.id ?? 'new'}
      fields={[
        { name: 'name', type: 'text', label: 'Nombre', required: true, wrapperClassName: 'col-span-2' },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
        {
          name: 'category',
          type: 'select',
          label: 'Categoría',
          wrapperClassName: 'col-span-2',
          options: categoryOptions,
          loading: categoriesQuery.isLoading,
          placeholder: 'Selecciona una categoría',
          description: categoriesQuery.isError
            ? 'No se pudieron cargar las categorías.'
            : undefined,
        },
      ]}
      defaultValues={getDefaultValues(editingCatalog)}
      columns={2}
      schema={catalogSchema}
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

export default CatalogForm;
