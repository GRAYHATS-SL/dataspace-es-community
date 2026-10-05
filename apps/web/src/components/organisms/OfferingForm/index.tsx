'use client';

import { useMemo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Typography from '@/components/atoms/Typography';
import FormSectionSeparator from '@/components/molecules/FormSectionSeparator';
import SmartForm, { type SmartFormField } from '@/components/organisms/SmartForm';
import {
  useCreateProductOffering,
  useLaunchedCategories,
  usePatchProductOffering,
  useProductSpecifications,
} from '@/hooks/queries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  type ProductOfferingFormData,
  productOfferingSchema,
} from '@/lib/validations/productOffering.schema';
import type { NewProductOffering, ProductOffering, ProductSpecification } from '@/types/api';

import PriceManagementSection from './PriceManagementSection';

type FormField = SmartFormField<ProductOfferingFormData>;

/** Props of `OfferingForm`. */
export interface OfferingFormProps {
  onClose: () => void;
  onSuccess?: (offering: ProductOffering) => void;
  editingOffering?: ProductOffering | null;
}

/** Maps the form values to the offering payload. */
function buildOfferingPayload(
  data: ProductOfferingFormData,
  specs: ProductSpecification[],
): NewProductOffering {
  const spec = specs.find((s) => s.id === data.productSpecification);
  // Here you define your business logic (default values, sellable flag, terms, places...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    lifecycleStatus: data.lifecycleStatus,
    productSpecification: spec?.id ? { id: spec.id, href: spec.href, name: spec.name } : undefined,
    category: data.category ? [{ id: data.category }] : [],
  };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(offering?: ProductOffering | null): Partial<ProductOfferingFormData> {
  if (!offering) {
    // Here you define your business logic (default values for new offerings).
    return {};
  }
  return {
    name: offering.name ?? '',
    description: offering.description ?? '',
    lifecycleStatus: offering.lifecycleStatus,
    productSpecification: offering.productSpecification?.id ?? '',
    category: offering.category?.[0]?.id ?? '',
  };
}

/**
 * Create/edit form of a product offering. After creating it, a second step lets the user
 * link or create prices.
 */
const OfferingForm = ({ onClose, onSuccess, editingOffering }: Readonly<OfferingFormProps>) => {
  const createMutation = useCreateProductOffering();
  const patchMutation = usePatchProductOffering();
  const specsQuery = useProductSpecifications();
  const categoriesQuery = useLaunchedCategories();
  const [createdOffering, setCreatedOffering] = useState<ProductOffering | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingOffering?.id;
  const isPending = createMutation.isPending || patchMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear oferta';

  const fields = useMemo<FormField[]>(
    () => [
      {
        name: 'name',
        type: 'text',
        label: 'Nombre',
        required: true,
        wrapperClassName: isEditing ? 'col-span-1' : 'col-span-2',
      },
      ...(isEditing
        ? [
            {
              name: 'lifecycleStatus',
              type: 'select',
              label: 'Estado',
              placeholder: 'Selecciona un estado',
              wrapperClassName: 'col-span-1',
              options: LIFECYCLE_OPTIONS,
            } satisfies FormField,
          ]
        : []),
      {
        name: 'description',
        type: 'textarea',
        label: 'Descripción',
        wrapperClassName: 'col-span-2',
        props: { rows: 2 },
      },
      {
        name: 'link-separator',
        type: 'custom',
        wrapperClassName: 'col-span-2',
        render: () => (
          <FormSectionSeparator
            title="Vinculación"
            description="Asocia esta oferta a una especificación y una categoría del catálogo."
          />
        ),
      },
      {
        name: 'productSpecification',
        type: 'select',
        label: 'Especificación de producto',
        required: true,
        wrapperClassName: 'col-span-1',
        options: (specsQuery.data ?? [])
          .map((s) => ({ label: s.name ?? s.id ?? '', value: s.id ?? '' }))
          .filter((o) => o.value),
        loading: specsQuery.isLoading,
        placeholder: 'Selecciona una especificación',
        description: specsQuery.isError ? 'No se pudieron cargar las especificaciones.' : undefined,
      },
      {
        name: 'category',
        type: 'select',
        label: 'Categoría',
        wrapperClassName: 'col-span-1',
        options: (categoriesQuery.data ?? [])
          .map((c) => ({ label: c.name ?? c.id ?? '', value: c.id ?? '' }))
          .filter((o) => o.value),
        loading: categoriesQuery.isLoading,
        placeholder: 'Selecciona una categoría',
        description: categoriesQuery.isError ? 'No se pudieron cargar las categorías.' : undefined,
      },
    ],
    [
      isEditing,
      specsQuery.data,
      specsQuery.isLoading,
      specsQuery.isError,
      categoriesQuery.data,
      categoriesQuery.isLoading,
      categoriesQuery.isError,
    ],
  );

  const handleSubmit = async (data: ProductOfferingFormData) => {
    setSubmitError(null);
    const payload = buildOfferingPayload(data, specsQuery.data ?? []);
    if (isEditing && editingOffering.id) {
      const offering = await patchMutation.mutateAsync({ id: editingOffering.id, payload });
      onSuccess?.(offering);
      onClose();
      return;
    }
    const offering = await createMutation.mutateAsync(payload);
    // Here you define your business logic (follow-up steps after creating the offering).
    setCreatedOffering(offering);
  };

  if (createdOffering?.id) {
    return (
      <div className="space-y-4">
        <Typography variant="small" color="gray" role="status">
          Oferta creada. Añade precios ahora o hazlo más tarde desde la edición.
        </Typography>
        <PriceManagementSection offeringId={createdOffering.id} />
        <div className="flex justify-end pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              onSuccess?.(createdOffering);
              onClose();
            }}
          >
            Finalizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SmartForm<ProductOfferingFormData>
        key={editingOffering?.id ?? 'new'}
        fields={fields}
        columns={2}
        schema={productOfferingSchema}
        defaultValues={getDefaultValues(editingOffering)}
        onSubmit={handleSubmit}
        onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
        submitText={isPending ? 'Guardando…' : idleLabel}
        loading={isPending}
        onCancel={onClose}
        resetOnSubmit={false}
      >
        {submitError && (
          <Typography variant="small" className="text-danger" role="alert">
            {submitError}
          </Typography>
        )}
      </SmartForm>
      {isEditing && editingOffering.id && (
        <PriceManagementSection offeringId={editingOffering.id} />
      )}
    </div>
  );
};

export default OfferingForm;
