'use client';

import { useMemo, useState } from 'react';

import Typography from '@/components/atoms/Typography';
import FormSectionSeparator from '@/components/molecules/FormSectionSeparator';
import SmartForm, { type SmartFormField, type SmartFormOption } from '@/components/organisms/SmartForm';
import {
  useCreateProductSpecification,
  usePatchProductSpecification,
  useResourceSpecifications,
  useServiceSpecifications,
} from '@/hooks/queries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import { TOKEN_SUPPLY_MODE_OPTIONS } from '@/lib/constants/productSpec';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  type ProductSpecificationFormData,
  productSpecificationSchema,
} from '@/lib/validations/productSpecification.schema';
import type {
  NewProductSpecification,
  ProductSpecification,
  ProductSpecificationCharacteristic,
  ResourceSpecification,
  ServiceSpecification,
} from '@/types/api';

type FormField = SmartFormField<ProductSpecificationFormData>;

/** Props of `ProductSpecForm`. */
export interface ProductSpecFormProps {
  onClose: () => void;
  onSuccess?: (spec: ProductSpecification) => void;
  editingProductSpec?: ProductSpecification | null;
}

/** Converts specifications into select options. */
function toSpecOptions(specs: (ResourceSpecification | ServiceSpecification)[]): SmartFormOption[] {
  // Here you define your business logic (e.g. only launched specifications are selectable).
  return specs
    .map((s) => ({ label: s.name ?? s.id ?? '', value: s.id ?? '' }))
    .filter((o) => o.value);
}

/**
 * Builds the characteristics of the specification from the form values
 * (access tokenization, access policy...).
 */
function buildProductSpecCharacteristics(
  _data: ProductSpecificationFormData,
  previous?: ProductSpecification | null,
): ProductSpecificationCharacteristic[] {
  // Here you define your business logic (tokenization and policy characteristics).
  return previous?.productSpecCharacteristic ?? [];
}

/** Reads the tokenization/policy fields of an existing specification into the form. */
function extractCharacteristicFields(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _spec: ProductSpecification,
): Partial<ProductSpecificationFormData> {
  // Here you define your business logic (inverse of `buildProductSpecCharacteristics`).
  return {};
}

/** Maps the form values to the product specification payload. */
function buildProductSpecPayload(
  data: ProductSpecificationFormData,
  previous?: ProductSpecification | null,
): Partial<NewProductSpecification> {
  const characteristics = buildProductSpecCharacteristics(data, previous);
  // Here you define your business logic (default values, derived fields...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    lifecycleStatus: data.lifecycleStatus,
    resourceSpecification: (data.resourceSpecification ?? []).map((id) => ({ id })),
    serviceSpecification: (data.serviceSpecification ?? []).map((id) => ({ id })),
    ...(characteristics.length > 0 && { productSpecCharacteristic: characteristics }),
  };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(
  spec?: ProductSpecification | null,
): Partial<ProductSpecificationFormData> {
  if (!spec) return { tokenized: false, resourceSpecification: [], serviceSpecification: [] };
  return {
    name: spec.name ?? '',
    description: spec.description ?? '',
    lifecycleStatus: LIFECYCLE_OPTIONS.find((o) => o.value === spec.lifecycleStatus)?.value,
    resourceSpecification: (spec.resourceSpecification ?? []).map((r) => r.id),
    serviceSpecification: (spec.serviceSpecification ?? []).map((s) => s.id),
    ...extractCharacteristicFields(spec),
  };
}

const separator = (name: string, title: string, description: string): FormField => ({
  name,
  type: 'custom',
  wrapperClassName: 'col-span-2',
  render: () => <FormSectionSeparator title={title} description={description} />,
});

const TOKEN_FIELDS: FormField[] = [
  separator(
    'separator-tokenization',
    'Tokenización de acceso',
    'Límites de peticiones y transferencia por token. El precio se configura en la oferta.',
  ),
  {
    name: 'tokenized',
    type: 'checkbox',
    label: 'Habilitar tokenización de acceso',
    wrapperClassName: 'col-span-2',
  },
  {
    name: 'tokenMaxRequests',
    type: 'text',
    label: 'Límite de peticiones por token',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 1, step: 1 },
    visible: (v) => !!v.tokenized,
    visibleWhen: ['tokenized'],
  },
  {
    name: 'tokenMaxTransferTB',
    type: 'text',
    label: 'Límite de transferencia por token (TB)',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 0, step: 0.1 },
    visible: (v) => !!v.tokenized,
    visibleWhen: ['tokenized'],
  },
  {
    name: 'tokenSupplyMode',
    type: 'select',
    label: 'Suministro',
    placeholder: 'Selecciona un modo',
    wrapperClassName: 'col-span-1',
    options: TOKEN_SUPPLY_MODE_OPTIONS,
    visible: (v) => !!v.tokenized,
    visibleWhen: ['tokenized'],
  },
  {
    name: 'tokenSupply',
    type: 'text',
    label: 'Cantidad emitida',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 1, step: 1 },
    visible: (v) => !!v.tokenized && v.tokenSupplyMode === 'limited',
    visibleWhen: ['tokenized', 'tokenSupplyMode'],
  },
];

const POLICY_FIELDS: FormField[] = [
  separator(
    'separator-policy',
    'Política de acceso',
    'Define quién puede acceder al recurso y bajo qué condiciones.',
  ),
  // Here you define your access policy fields.
];

/** Create/edit form of a product specification (linked specs, tokenization, policy). */
const ProductSpecForm = ({
  onClose,
  onSuccess,
  editingProductSpec,
}: Readonly<ProductSpecFormProps>) => {
  const createMutation = useCreateProductSpecification();
  const patchMutation = usePatchProductSpecification();
  const resourceSpecsQuery = useResourceSpecifications();
  const serviceSpecsQuery = useServiceSpecifications();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingProductSpec?.id;
  const isPending = createMutation.isPending || patchMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear especificación';

  const fields = useMemo<FormField[]>(
    () => [
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
      separator(
        'separator-specs',
        'Especificaciones técnicas',
        'Asocia las especificaciones de recurso y servicio que implementan este producto.',
      ),
      {
        name: 'resourceSpecification',
        type: 'multiselect',
        label: 'Especificaciones de recurso',
        wrapperClassName: 'col-span-2',
        options: toSpecOptions(resourceSpecsQuery.data ?? []),
        loading: resourceSpecsQuery.isLoading,
        description: resourceSpecsQuery.isError
          ? 'No se pudieron cargar las especificaciones de recurso.'
          : undefined,
      },
      {
        name: 'serviceSpecification',
        type: 'multiselect',
        label: 'Especificaciones de servicio',
        wrapperClassName: 'col-span-2',
        options: toSpecOptions(serviceSpecsQuery.data ?? []),
        loading: serviceSpecsQuery.isLoading,
        description: serviceSpecsQuery.isError
          ? 'No se pudieron cargar las especificaciones de servicio.'
          : undefined,
      },
      ...TOKEN_FIELDS,
      ...POLICY_FIELDS,
    ],
    [
      resourceSpecsQuery.data,
      resourceSpecsQuery.isLoading,
      resourceSpecsQuery.isError,
      serviceSpecsQuery.data,
      serviceSpecsQuery.isLoading,
      serviceSpecsQuery.isError,
    ],
  );

  const handleSubmit = async (data: ProductSpecificationFormData) => {
    setSubmitError(null);
    const payload = buildProductSpecPayload(data, editingProductSpec);
    const spec =
      isEditing && editingProductSpec.id
        ? await patchMutation.mutateAsync({ id: editingProductSpec.id, payload })
        : await createMutation.mutateAsync(payload);
    onSuccess?.(spec);
    onClose();
  };

  return (
    <SmartForm<ProductSpecificationFormData>
      key={editingProductSpec?.id ?? 'new'}
      fields={fields}
      columns={2}
      schema={productSpecificationSchema}
      defaultValues={getDefaultValues(editingProductSpec)}
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

export default ProductSpecForm;
