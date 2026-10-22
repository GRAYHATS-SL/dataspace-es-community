'use client';

import { useMemo, useState } from 'react';

import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import {
  useCreateCatalog,
  usePatchCatalog,
  useSetCatalogCategories,
} from '@/hooks/queries/useCatalogQueries';
import { useLaunchedCategories } from '@/hooks/queries/useCategoryQueries';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { CatalogFormData, catalogSchema } from '@/lib/validations/catalog.schema';
import type { Catalog } from '@/types/api';

interface CatalogFormProps {
  onClose: () => void;
  editingCatalog?: Catalog | null;
}

const CatalogForm = ({ onClose, editingCatalog }: Readonly<CatalogFormProps>) => {
  const createMutation = useCreateCatalog();
  const patchMutation = usePatchCatalog();
  const setCategoriesMutation = useSetCatalogCategories();
  const { data: launchedCategories = [] } = useLaunchedCategories();

  const isEditing = !!editingCatalog;
  const isPending =
    createMutation.isPending || patchMutation.isPending || setCategoriesMutation.isPending;
  const pendingLabel = isEditing ? 'Guardando…' : 'Creando…';
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear catálogo';
  const submitText = isPending ? pendingLabel : idleLabel;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () =>
      launchedCategories
        .map((c) => ({ label: c.name ?? c.id ?? '', value: c.id ?? '' }))
        .filter((o) => o.value),
    [launchedCategories],
  );

  return (
    <SmartForm<CatalogFormData>
      key={editingCatalog?.id ?? 'new'}
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
        // { name: 'version', type: 'text', label: 'Versión', wrapperClassName: 'col-span-1' },
        // {
        //   name: 'catalogType',
        //   type: 'select',
        //   label: 'Tipo de catálogo',
        //   wrapperClassName: 'col-span-1',
        //   options: CATALOG_TYPE_OPTIONS,
        //   placeholder: 'Selecciona un tipo',
        // },
        {
          name: 'category',
          type: 'select',
          label: 'Categoría',
          wrapperClassName: 'col-span-2',
          options: categoryOptions,
          placeholder: 'Selecciona una categoría',
        },
      ]}
      defaultValues={
        isEditing
          ? {
              name: editingCatalog.name ?? '',
              description: editingCatalog.description ?? '',
              // version: editingCatalog.version ?? '',
              // catalogType: editingCatalog.catalogType,
              category: editingCatalog.category?.[0]?.id ?? '',
            }
          : {
              // version: '1.0',
            }
      }
      columns={2}
      schema={catalogSchema}
      onSubmit={async (data) => {
        if (isEditing) {
          await patchMutation.mutateAsync({
            id: editingCatalog.id!,
            payload: {
              name: data.name.trim(),
              description: data.description?.trim(),
              version: editingCatalog.version,
              // catalogType: data.catalogType || undefined,
            },
          });
          const initialId = editingCatalog.category?.[0]?.id ?? '';
          const newId = data.category ?? '';
          if (initialId !== newId) {
            await setCategoriesMutation.mutateAsync({
              id: editingCatalog.id!,
              categoryIds: newId ? [newId] : [],
            });
          }
        } else {
          const catalog = await createMutation.mutateAsync({
            name: data.name.trim(),
            description: data.description?.trim(),
            version: '1.0',
            // catalogType: data.catalogType || undefined,
          });
          if (data.category && catalog.id) {
            await setCategoriesMutation.mutateAsync({
              id: catalog.id,
              categoryIds: [data.category],
            });
          }
        }
        onClose();
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={submitText}
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
