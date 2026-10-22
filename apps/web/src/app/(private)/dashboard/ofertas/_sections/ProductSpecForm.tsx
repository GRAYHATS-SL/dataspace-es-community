'use client';

import { useMemo, useState } from 'react';
import type { FieldValues, Path } from 'react-hook-form';

import Typography from '@/components/atoms/Typography';
import SmartForm, { type SmartFormField } from '@/components/organisms/SmartForm';
import {
  useCreateProductSpecificationWithPolicy,
  usePatchProductSpecificationWithPolicy,
} from '@/hooks/queries/useProductSpecificationQueries';
import { useResourceSpecifications } from '@/hooks/queries/useResourceSpecificationQueries';
import { useServiceSpecifications } from '@/hooks/queries/useServiceSpecificationQueries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import {
  DATA_STANDARD_OPTIONS,
  DISTRIBUTION_FORMAT_OPTIONS,
  LICENSE_OPTIONS,
} from '@/lib/constants/productSpec';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  buildDatasetMetadataChar,
  type DatasetMetadataValue,
  extractDatasetMetadata,
} from '@/lib/utils/productSpecMetadata';
import {
  extractPolicyFormValues,
  type OdrlFormData,
  type PolicyFormValues,
} from '@/lib/utils/productSpecPolicy';
import {
  buildTokenOfferConfigChar,
  extractTokenOfferConfig,
  mergeTokenOfferConfigChar,
  TOKEN_OFFER_CONFIG_CHAR_ID,
  type TokenOfferConfig,
  type TokenOfferStatus,
  type TokenOfferSupplyMode,
} from '@/lib/utils/tokenOfferConfig';
import {
  ProductSpecificationFormData,
  productSpecificationSchema,
  UpdateProductSpecificationFormData,
  updateProductSpecificationSchema,
} from '@/lib/validations/productSpecification.schema';
import type { ProductSpecification } from '@/types/api';

const buildMetadataChar = (data: DatasetMetadataValue) => {
  const value: DatasetMetadataValue = {};
  if (data.distributions?.trim()) value.distributions = data.distributions.trim();
  if (data.standard?.trim()) value.standard = data.standard.trim();
  if (data.license?.trim()) value.license = data.license.trim();
  if (typeof data.accuracy === 'number') value.accuracy = data.accuracy;
  if (typeof data.completeness === 'number') value.completeness = data.completeness;
  if (typeof data.consistency === 'number') value.consistency = data.consistency;
  if (typeof data.credibility === 'number') value.credibility = data.credibility;
  if (typeof data.timeliness === 'number') value.timeliness = data.timeliness;
  return buildDatasetMetadataChar(value);
};

const extractMetadataFromSpec = (spec: ProductSpecification): DatasetMetadataValue => {
  const value = extractDatasetMetadata(spec);
  return {
    distributions: value.distributions ?? '',
    standard: value.standard ?? '',
    license: value.license ?? '',
    accuracy: value.accuracy,
    completeness: value.completeness,
    consistency: value.consistency,
    credibility: value.credibility,
    timeliness: value.timeliness,
  };
};

interface TokenSpecFormFields {
  tokenized?: boolean;
  tokenMaxRequests?: number;
  tokenMaxTransferTB?: number;
  tokenSupplyMode?: TokenOfferSupplyMode;
  tokenSupply?: number;
}

/** Rebuilds `TokenOfferConfig` from the form fields, or `undefined` if not tokenized. */
const buildTokenConfigFromForm = (
  data: TokenSpecFormFields,
  previousStatus: TokenOfferStatus,
): TokenOfferConfig | undefined => {
  if (
    !data.tokenized ||
    !data.tokenMaxRequests ||
    !data.tokenMaxTransferTB ||
    !data.tokenSupplyMode
  ) {
    return undefined;
  }
  return {
    maxRequests: data.tokenMaxRequests,
    maxTransferTB: data.tokenMaxTransferTB,
    supplyMode: data.tokenSupplyMode,
    ...(data.tokenSupplyMode === 'escaso' && data.tokenSupply ? { supply: data.tokenSupply } : {}),
    tokenOfferStatus: previousStatus,
  };
};

const extractTokenFieldsFromSpec = (spec: ProductSpecification): TokenSpecFormFields => {
  const config = extractTokenOfferConfig(spec);
  return {
    tokenized: !!config,
    tokenMaxRequests: config?.maxRequests,
    tokenMaxTransferTB: config?.maxTransferTB,
    tokenSupplyMode: config?.supplyMode,
    tokenSupply: config?.supply,
  };
};

interface ProductSpecFormProps {
  onClose: () => void;
  editingProductSpec?: ProductSpecification | null;
}

const TOKEN_SUPPLY_MODE_OPTIONS = [
  { label: 'Escaso (cantidad limitada)', value: 'escaso' },
  { label: 'Abundante (sin límite)', value: 'abundante' },
];

const SectionSeparator = ({
  title,
  description,
}: Readonly<{ title: string; description: string }>) => (
  <div className="border-t border-gray-lightest pt-4">
    <Typography as="h3" variant="form-label" color="primary" className="font-semibold">
      {title}
    </Typography>
    <Typography as="p" variant="form-hint" color="gray" className="mt-0.5">
      {description}
    </Typography>
  </div>
);

const Note = ({ children }: Readonly<{ children: string }>) => (
  <Typography as="p" variant="form-hint" color="gray">
    {children}
  </Typography>
);

/** Access policy section fields. */
const buildPolicyFields = <T extends FieldValues>(): SmartFormField<T>[] => [
  {
    name: 'separator-odrl',
    type: 'custom',
    wrapperClassName: 'col-span-2',
    render: () => (
      <SectionSeparator
        title="Política de acceso"
        description="Define qué rutas del servicio de datos vende la oferta y, opcionalmente, el volumen que da acceso cada pedido."
      />
    ),
  },
  {
    name: 'odrlPathRegex' as Path<T>,
    type: 'text',
    label: 'Regex de rutas',
    required: true,
    placeholder: '^/(bytes/[0-9]+|anything/.*)$',
    wrapperClassName: 'col-span-2',
    description:
      'Expresión regular de las rutas que vende la oferta. Ej: ^/(bytes/[0-9]+|anything/.*)$',
  } as SmartFormField<T>,
  {
    name: 'odrlOfferId' as Path<T>,
    type: 'text',
    label: 'Identificador de la oferta (offerId)',
    placeholder: 'Ej: provider02-httpbin-cuota',
    wrapperClassName: 'col-span-2',
    description:
      'Opcional. Solo para ofertas medidas; texto corto sin caracteres especiales (letras, números y guiones).',
  } as SmartFormField<T>,
  {
    name: 'odrlBytesLimit' as Path<T>,
    type: 'text',
    label: 'Límite de bytes',
    placeholder: 'Ej: 51200',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 1, step: 1 },
    description: 'Bytes que da cada pedido (entero). Opcional.',
  } as SmartFormField<T>,
  {
    name: 'odrlRequestsLimit' as Path<T>,
    type: 'text',
    label: 'Límite de peticiones',
    placeholder: 'Ej: 20',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 1, step: 1 },
    description: 'Peticiones que da cada pedido (entero). Opcional.',
  } as SmartFormField<T>,
  {
    name: 'note-odrl',
    type: 'custom',
    wrapperClassName: 'col-span-2',
    render: () => (
      <div className="flex flex-col gap-1">
        <Note>Las rutas de las ofertas de un mismo proveedor no se pueden solapar.</Note>
        <Note>
          Una oferta medida exige configurar en la pasarela del proveedor una ruta con este
          identificador; sin ella el comprador recibe 404 aunque haya pagado.
        </Note>
      </div>
    ),
  },
];

/** Informational notice of the tokenization section. */
const buildTokenNoteField = <T extends FieldValues>(): SmartFormField<T> => ({
  name: 'note-tokenizacion',
  type: 'custom',
  wrapperClassName: 'col-span-2',
  render: () => (
    <Note>
      Estos límites no se aplican en v2; el volumen que da acceso lo controlan los límites de la
      Política de acceso.
    </Note>
  ),
});

/** Maps form policy values to the service input. */
const buildPolicyFromForm = (data: {
  name?: string;
  odrlPathRegex?: string;
  odrlOfferId?: string;
  odrlBytesLimit?: number;
  odrlRequestsLimit?: number;
}): OdrlFormData => ({
  name: data.name,
  odrlPathRegex: data.odrlPathRegex?.trim() ?? '',
  ...(data.odrlOfferId?.trim() && { odrlOfferId: data.odrlOfferId.trim() }),
  ...(data.odrlBytesLimit !== undefined && { odrlBytesLimit: data.odrlBytesLimit }),
  ...(data.odrlRequestsLimit !== undefined && { odrlRequestsLimit: data.odrlRequestsLimit }),
});

const ProductSpecForm = ({ onClose, editingProductSpec }: Readonly<ProductSpecFormProps>) => {
  const isEditing = !!editingProductSpec;
  const createMutation = useCreateProductSpecificationWithPolicy();
  const patchMutation = usePatchProductSpecificationWithPolicy();
  const { data: resourceSpecs = [] } = useResourceSpecifications();
  const { data: serviceSpecs = [] } = useServiceSpecifications();
  const isPending = createMutation.isPending || patchMutation.isPending;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resourceSpecOptions = useMemo(
    () =>
      resourceSpecs
        .filter((rs) => rs.lifecycleStatus === 'Launched')
        .map((rs) => ({ label: rs.name ?? rs.id ?? '', value: rs.id ?? '' }))
        .filter((o) => o.value),
    [resourceSpecs],
  );
  const serviceSpecOptions = useMemo(
    () =>
      serviceSpecs
        .filter((ss) => ss.lifecycleStatus === 'Launched')
        .map((ss) => ({ label: ss.name ?? ss.id ?? '', value: ss.id ?? '' }))
        .filter((o) => o.value),
    [serviceSpecs],
  );

  if (isEditing) {
    return (
      <SmartForm<UpdateProductSpecificationFormData>
        key={editingProductSpec.id}
        fields={[
          // — Basic information —
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
          // { name: 'brand', type: 'text', label: 'Marca', wrapperClassName: 'col-span-1' },
          // {
          //   name: 'productNumber',
          //   type: 'text',
          //   label: 'Referencia / SKU',
          //   placeholder: 'Ej: SKU-001',
          //   wrapperClassName: 'col-span-1',
          // },
          {
            name: 'description',
            type: 'textarea',
            label: 'Descripción',
            wrapperClassName: 'col-span-2',
            props: { rows: 2 },
          },
          // {
          //   name: 'isBundle',
          //   type: 'checkbox',
          //   label: 'Es un paquete de especificaciones',
          //   wrapperClassName: 'col-span-1',
          // },
          // — Dataset metadata —
          {
            name: 'separator-metadata',
            type: 'custom',
            wrapperClassName: 'col-span-2',
            render: () => (
              <SectionSeparator
                title="Metadatos del dataset"
                description="Información descriptiva sobre el formato, estándar, licencia y calidad del dato."
              />
            ),
          },
          {
            name: 'distributions',
            type: 'select',
            label: 'Formato de distribución',
            placeholder: 'Selecciona un formato',
            wrapperClassName: 'col-span-1',
            options: DISTRIBUTION_FORMAT_OPTIONS as unknown as { label: string; value: string }[],
          },
          {
            name: 'standard',
            type: 'select',
            label: 'Estándar',
            placeholder: 'Selecciona un estándar',
            wrapperClassName: 'col-span-1',
            options: DATA_STANDARD_OPTIONS as unknown as { label: string; value: string }[],
          },
          {
            name: 'license',
            type: 'select',
            label: 'Licencia',
            placeholder: 'Selecciona una licencia',
            wrapperClassName: 'col-span-1',
            options: LICENSE_OPTIONS as unknown as { label: string; value: string }[],
          },
          {
            name: 'accuracy',
            type: 'text',
            label: 'Exactitud (%)',
            required: true,
            placeholder: '0-100',
            wrapperClassName: 'col-span-1',
            props: { type: 'number', min: 0, max: 100, step: 1 },
          },
          {
            name: 'completeness',
            type: 'text',
            label: 'Completitud (%)',
            required: true,
            placeholder: '0-100',
            wrapperClassName: 'col-span-1',
            props: { type: 'number', min: 0, max: 100, step: 1 },
          },
          {
            name: 'consistency',
            type: 'text',
            label: 'Consistencia (%)',
            required: true,
            placeholder: '0-100',
            wrapperClassName: 'col-span-1',
            props: { type: 'number', min: 0, max: 100, step: 1 },
          },
          {
            name: 'credibility',
            type: 'text',
            label: 'Credibilidad (%)',
            required: true,
            placeholder: '0-100',
            wrapperClassName: 'col-span-1',
            props: { type: 'number', min: 0, max: 100, step: 1 },
          },
          {
            name: 'timeliness',
            type: 'text',
            label: 'Actualidad (%)',
            required: true,
            placeholder: '0-100',
            wrapperClassName: 'col-span-1',
            props: { type: 'number', min: 0, max: 100, step: 1 },
          },
          // — Access tokenization —
          {
            name: 'separator-tokenizacion',
            type: 'custom',
            wrapperClassName: 'col-span-2',
            render: () => (
              <SectionSeparator
                title="Tokenización de acceso"
                description="Límites de peticiones y transferencia por token. El precio y el modo (fijo/dinámico) se configuran en la pestaña Precios."
              />
            ),
          },
          buildTokenNoteField<UpdateProductSpecificationFormData>(),
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
            wrapperClassName: 'col-span-1',
            options: TOKEN_SUPPLY_MODE_OPTIONS,
            visible: (v) => !!v.tokenized,
            visibleWhen: ['tokenized'],
          },
          {
            name: 'tokenSupply',
            type: 'text',
            label: 'Cantidad emitida (N)',
            wrapperClassName: 'col-span-1',
            props: { type: 'number', min: 1, step: 1 },
            visible: (v) => !!v.tokenized && v.tokenSupplyMode === 'escaso',
            visibleWhen: ['tokenized', 'tokenSupplyMode'],
          },
          ...buildPolicyFields<UpdateProductSpecificationFormData>(),
        ]}
        columns={2}
        schema={updateProductSpecificationSchema}
        defaultValues={
          {
            name: editingProductSpec.name ?? '',
            // brand: editingProductSpec.brand ?? '',
            // productNumber: editingProductSpec.productNumber ?? '',
            description: editingProductSpec.description ?? '',
            lifecycleStatus:
              editingProductSpec.lifecycleStatus as UpdateProductSpecificationFormData['lifecycleStatus'],
            ...extractMetadataFromSpec(editingProductSpec),
            ...extractTokenFieldsFromSpec(editingProductSpec),
            ...(extractPolicyFormValues(editingProductSpec) satisfies PolicyFormValues),
          } as UpdateProductSpecificationFormData
        }
        resetOnSubmit={false}
        onSubmit={async (data) => {
          const metaChar = buildMetadataChar({
            distributions: data.distributions,
            standard: data.standard,
            license: data.license,
            accuracy: data.accuracy,
            completeness: data.completeness,
            consistency: data.consistency,
            credibility: data.credibility,
            timeliness: data.timeliness,
          });
          const previousTokenStatus =
            extractTokenOfferConfig(editingProductSpec)?.tokenOfferStatus ?? 'draft';
          const tokenConfig = buildTokenConfigFromForm(data, previousTokenStatus);
          const tokenChar = buildTokenOfferConfigChar(tokenConfig);
          const upsertChars = [metaChar, tokenChar].filter(
            (c): c is NonNullable<typeof c> => c !== null,
          );

          // A single PATCH: the service reads the current characteristics, merges by id and replaces policy/credential (v2: the PATCH replaces the full list).
          await patchMutation.mutateAsync({
            id: editingProductSpec.id!,
            payload: {
              ...(data.name?.trim() && { name: data.name.trim() }),
              // ...(data.brand?.trim() && { brand: data.brand.trim() }),
              // ...(data.productNumber?.trim() && { productNumber: data.productNumber.trim() }),
              ...(data.description?.trim() && { description: data.description.trim() }),
              ...(data.lifecycleStatus && { lifecycleStatus: data.lifecycleStatus }),
              ...(upsertChars.length > 0 && { productSpecCharacteristic: upsertChars }),
            },
            policy: buildPolicyFromForm(data),
            removeCharIds: tokenConfig ? [] : [TOKEN_OFFER_CONFIG_CHAR_ID],
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
    <SmartForm<ProductSpecificationFormData>
      fields={[
        // — Basic information —
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
        // { name: 'brand', type: 'text', label: 'Marca', wrapperClassName: 'col-span-1' },
        // {
        //   name: 'productNumber',
        //   type: 'text',
        //   label: 'Referencia / SKU',
        //   placeholder: 'Ej: SKU-001',
        //   wrapperClassName: 'col-span-1',
        // },
        {
          name: 'description',
          type: 'textarea',
          label: 'Descripción',
          wrapperClassName: 'col-span-2',
          props: { rows: 2 },
        },
        // {
        //   name: 'isBundle',
        //   type: 'checkbox',
        //   label: 'Es un paquete de especificaciones',
        //   wrapperClassName: 'col-span-1',
        // },
        // — Technical specifications —
        {
          name: 'separator-specs',
          type: 'custom',
          wrapperClassName: 'col-span-2',
          render: () => (
            <SectionSeparator
              title="Especificaciones técnicas"
              description="Asocia las especificaciones de recurso y servicio que implementan este producto."
            />
          ),
        },
        {
          name: 'resourceSpecification',
          type: 'multiselect',
          label: 'Especificaciones de recurso',
          wrapperClassName: 'col-span-2',
          options: resourceSpecOptions,
        },
        {
          name: 'serviceSpecification',
          type: 'multiselect',
          label: 'Especificaciones de servicio',
          wrapperClassName: 'col-span-2',
          options: serviceSpecOptions,
        },
        // — Dataset metadata —
        {
          name: 'separator-metadata',
          type: 'custom',
          wrapperClassName: 'col-span-2',
          render: () => (
            <SectionSeparator
              title="Metadatos del dataset"
              description="Información descriptiva sobre el formato, estándar, licencia y calidad del dato."
            />
          ),
        },
        {
          name: 'distributions',
          type: 'select',
          label: 'Formato de distribución',
          placeholder: 'Selecciona un formato',
          wrapperClassName: 'col-span-1',
          options: DISTRIBUTION_FORMAT_OPTIONS as unknown as { label: string; value: string }[],
        },
        {
          name: 'standard',
          type: 'select',
          label: 'Estándar',
          placeholder: 'Selecciona un estándar',
          wrapperClassName: 'col-span-1',
          options: DATA_STANDARD_OPTIONS as unknown as { label: string; value: string }[],
        },
        {
          name: 'license',
          type: 'select',
          label: 'Licencia',
          placeholder: 'Selecciona una licencia',
          wrapperClassName: 'col-span-1',
          options: LICENSE_OPTIONS as unknown as { label: string; value: string }[],
        },
        {
          name: 'accuracy',
          type: 'text',
          label: 'Exactitud (%)',
          required: true,
          placeholder: '0-100',
          wrapperClassName: 'col-span-1',
          props: { type: 'number', min: 0, max: 100, step: 1 },
        },
        {
          name: 'completeness',
          type: 'text',
          label: 'Completitud (%)',
          required: true,
          placeholder: '0-100',
          wrapperClassName: 'col-span-1',
          props: { type: 'number', min: 0, max: 100, step: 1 },
        },
        {
          name: 'consistency',
          type: 'text',
          label: 'Consistencia (%)',
          required: true,
          placeholder: '0-100',
          wrapperClassName: 'col-span-1',
          props: { type: 'number', min: 0, max: 100, step: 1 },
        },
        {
          name: 'credibility',
          type: 'text',
          label: 'Credibilidad (%)',
          required: true,
          placeholder: '0-100',
          wrapperClassName: 'col-span-1',
          props: { type: 'number', min: 0, max: 100, step: 1 },
        },
        {
          name: 'timeliness',
          type: 'text',
          label: 'Actualidad (%)',
          required: true,
          placeholder: '0-100',
          wrapperClassName: 'col-span-1',
          props: { type: 'number', min: 0, max: 100, step: 1 },
        },
        // — Access tokenization —
        {
          name: 'separator-tokenizacion',
          type: 'custom',
          wrapperClassName: 'col-span-2',
          render: () => (
            <SectionSeparator
              title="Tokenización de acceso"
              description="Límites de peticiones y transferencia por token. El precio y el modo (fijo/dinámico) se configuran en la pestaña Precios."
            />
          ),
        },
        buildTokenNoteField<ProductSpecificationFormData>(),
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
          wrapperClassName: 'col-span-1',
          options: TOKEN_SUPPLY_MODE_OPTIONS,
          visible: (v) => !!v.tokenized,
          visibleWhen: ['tokenized'],
        },
        {
          name: 'tokenSupply',
          type: 'text',
          label: 'Cantidad emitida (N)',
          wrapperClassName: 'col-span-1',
          props: { type: 'number', min: 1, step: 1 },
          visible: (v) => !!v.tokenized && v.tokenSupplyMode === 'escaso',
          visibleWhen: ['tokenized', 'tokenSupplyMode'],
        },
        ...buildPolicyFields<ProductSpecificationFormData>(),
      ]}
      columns={2}
      schema={productSpecificationSchema}
      onSubmit={async (data) => {
        const metaChar = buildMetadataChar({
          distributions: data.distributions,
          standard: data.standard,
          license: data.license,
          accuracy: data.accuracy,
          completeness: data.completeness,
          consistency: data.consistency,
          credibility: data.credibility,
          timeliness: data.timeliness,
        });

        const tokenConfig = buildTokenConfigFromForm(data, 'draft');
        const characteristics = mergeTokenOfferConfigChar(
          { productSpecCharacteristic: metaChar ? [metaChar] : undefined },
          tokenConfig,
        );

        // A single POST with metadata + tokenization + policy + credential.
        await createMutation.mutateAsync({
          input: {
            name: data.name,
            // ...(data.brand && { brand: data.brand }),
            // ...(data.productNumber && { productNumber: data.productNumber }),
            ...(data.description && { description: data.description }),
            ...(data.lifecycleStatus && { lifecycleStatus: data.lifecycleStatus }),
            resourceSpecification: (data.resourceSpecification ?? []).map((id) => ({ id })),
            serviceSpecification: (data.serviceSpecification ?? []).map((id) => ({ id })),
            ...(characteristics.length > 0 && { productSpecCharacteristic: characteristics }),
          },
          policy: buildPolicyFromForm(data),
        });
        onClose();
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={createMutation.isPending ? 'Creando…' : 'Crear especificación'}
      loading={createMutation.isPending}
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

export default ProductSpecForm;
