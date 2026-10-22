'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import Segmented from '@/components/atoms/Segmented';
import Typography from '@/components/atoms/Typography';
import SmartForm from '@/components/organisms/SmartForm';
import {
  useCreateProductOfferingPrice,
  usePatchProductOfferingPrice,
} from '@/hooks/queries/useProductOfferingPriceQueries';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import type { TokenPricingParams } from '@/lib/utils/tokenQuote';
import {
  ProductOfferingPriceFormData,
  productOfferingPriceSchema,
  UpdateProductOfferingPriceFormData,
  updateProductOfferingPriceSchema,
} from '@/lib/validations/productOfferingPrice.schema';
import type { ProductOfferingPrice } from '@/types/api';

interface PriceFormProps {
  onClose: () => void;
  editingPrice?: ProductOfferingPrice | null;
}

// A token is always paid in a single payment (gaps.md decision 5): this form does not expose "Price type" — it is silently set to 'one time' (see `defaultValues`/`onSubmit`).
const PRICING_MODE_OPTIONS: { value: 'fijo' | 'dinamico'; label: string }[] = [
  { value: 'fijo', label: 'Fijo' },
  { value: 'dinamico', label: 'Cotización dinámica' },
];
const SUPPLY_MODE_OPTIONS: { value: 'escaso' | 'abundante'; label: string }[] = [
  { value: 'escaso', label: 'Escaso' },
  { value: 'abundante', label: 'Abundante' },
];
// γ and kd are fixed options chosen by the owner, not free numbers.
const GAMMA_OPTIONS = [
  { value: '1', label: 'Lineal' },
  { value: '1.8', label: 'Convexa' },
];
const KD_OPTIONS = [
  { value: '0.35', label: 'Baja' },
  { value: '0.6', label: 'Media' },
  { value: '1', label: 'Alta' },
];

interface TokenPricingFormFields {
  price?: { value: number };
  tokenPricingMode?: 'fijo' | 'dinamico';
  tokenSupplyMode?: 'escaso' | 'abundante';
  tokenSupply?: number;
  tokenGamma?: number;
  tokenKd?: number;
  tokenFloor?: number;
  tokenCap?: number;
}

/** Derives `priceType`/`pricingLogicAlgorithm` from the token price mode. */
const buildTokenPricingPatch = (data: TokenPricingFormFields) => {
  if (data.tokenPricingMode !== 'dinamico') {
    return { priceType: 'one time' as const, pricingLogicAlgorithm: [] };
  }
  const p0 = data.price?.value ?? 0;
  const params: TokenPricingParams = {
    P0: p0,
    ...(data.tokenSupplyMode === 'escaso' && data.tokenSupply ? { N: data.tokenSupply } : {}),
    gamma: data.tokenGamma ?? 1,
    kd: data.tokenKd ?? 0.6,
    floor: data.tokenFloor ?? p0,
    cap: data.tokenCap ?? p0,
  };
  return {
    priceType: 'one time' as const,
    pricingLogicAlgorithm: [{ description: JSON.stringify(params) }],
  };
};

const TOKEN_FORM_ONLY_KEYS = [
  'tokenPricingMode',
  'tokenSupplyMode',
  'tokenSupply',
  'tokenGamma',
  'tokenKd',
  'tokenFloor',
  'tokenCap',
] as const;

/** Token fields are form-only. */
function omitTokenFormFields<T extends Record<string, unknown>>(
  data: T,
): Omit<T, (typeof TOKEN_FORM_ONLY_KEYS)[number]> {
  const clone: Record<string, unknown> = { ...data };
  for (const key of TOKEN_FORM_ONLY_KEYS) Reflect.deleteProperty(clone, key);
  return clone as Omit<T, (typeof TOKEN_FORM_ONLY_KEYS)[number]>;
}

function withDisabledFieldDefaults<T extends Record<string, unknown>>(
  data: T,
): Omit<T, 'productOfferingTerm'> {
  const clone: Record<string, unknown> = { ...data };
  delete clone.productOfferingTerm;
  return clone as Omit<T, 'productOfferingTerm'>;
}

/** Parses `TokenPricingParams` from `pricingLogicAlgorithm[0].description`. */
function parseTokenPricingParams(
  price: ProductOfferingPrice | null | undefined,
): TokenPricingParams | undefined {
  const raw = price?.pricingLogicAlgorithm?.[0]?.description;
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof (parsed as TokenPricingParams).P0 === 'number') {
      return parsed as TokenPricingParams;
    }
  } catch {
    // description is not a serialized TokenPricingParams — non-dynamic price.
  }
  return undefined;
}

const PriceForm = ({ onClose, editingPrice }: Readonly<PriceFormProps>) => {
  const isEditing = !!editingPrice;
  const createMutation = useCreateProductOfferingPrice();
  const patchMutation = usePatchProductOfferingPrice();
  const isPending = createMutation.isPending || patchMutation.isPending;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const baseFields = [
    // — Identification —
    {
      name: 'name' as const,
      type: 'text' as const,
      label: 'Nombre',
      required: true,
      wrapperClassName: 'col-span-1',
    },
    {
      name: 'description' as const,
      type: 'text' as const,
      label: 'Descripción (qué incluye este precio)',
      wrapperClassName: 'col-span-1',
    },
    // — Amount —
    {
      name: 'amount-separator' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-2',
      render: () => (
        <div className="border-t border-gray-lightest pt-4">
          <Typography as="h3" variant="form-label" color="primary" className="font-semibold">
            Importe
          </Typography>
        </div>
      ),
    },
    {
      name: 'price.value' as const,
      type: 'text' as const,
      label: 'Importe',
      required: true,
      wrapperClassName: 'col-span-2',
      props: { type: 'number', min: 0, step: '0.01', suffix: '€' },
    },
    // — Token quotation —
    {
      name: 'token-separator' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-2',
      render: () => (
        <div className="border-t border-gray-lightest pt-4">
          <Typography as="h3" variant="form-label" color="primary" className="font-semibold">
            Cotización de tokens
          </Typography>
          <Typography as="p" variant="form-hint" color="gray" className="mt-0.5">
            El pago de un token es siempre único; solo cambia cómo se calcula el importe.
          </Typography>
        </div>
      ),
    },
    {
      name: 'pricingModeField' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-2',
      render: (methods: UseFormReturn<ProductOfferingPriceFormData>) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Modo de precio</span>
          <Segmented
            value={methods.watch('tokenPricingMode') ?? 'fijo'}
            onChange={(v) => methods.setValue('tokenPricingMode', v, { shouldValidate: true })}
            options={PRICING_MODE_OPTIONS}
            aria-label="Modo de precio"
          />
        </div>
      ),
    },
    {
      name: 'supplyModeField' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-1',
      visible: (v: TokenPricingFormFields) => v.tokenPricingMode === 'dinamico',
      render: (methods: UseFormReturn<ProductOfferingPriceFormData>) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Suministro (escasez)</span>
          <Segmented
            value={methods.watch('tokenSupplyMode') ?? 'abundante'}
            onChange={(v) => {
              methods.setValue('tokenSupplyMode', v);
              if (v === 'abundante') methods.setValue('tokenSupply', undefined);
            }}
            options={SUPPLY_MODE_OPTIONS}
            aria-label="Suministro"
          />
        </div>
      ),
    },
    {
      name: 'tokenSupply' as const,
      type: 'text' as const,
      label: 'Tokens a emitir',
      wrapperClassName: 'col-span-2',
      props: { type: 'number', min: 1, step: 1 },
      visible: (v: TokenPricingFormFields) =>
        v.tokenPricingMode === 'dinamico' && v.tokenSupplyMode === 'escaso',
      visibleWhen: ['tokenPricingMode', 'tokenSupplyMode'],
    },
    {
      name: 'tokenFloor' as const,
      type: 'text' as const,
      label: 'Suelo (€)',
      required: true,
      wrapperClassName: 'col-span-1',
      props: { type: 'number', min: 0, step: '0.01' },
      visible: (v: TokenPricingFormFields) => v.tokenPricingMode === 'dinamico',
      visibleWhen: ['tokenPricingMode'],
    },
    {
      name: 'tokenCap' as const,
      type: 'text' as const,
      label: 'Techo (€)',
      required: true,
      wrapperClassName: 'col-span-1',
      props: { type: 'number', min: 0, step: '0.01' },
      visible: (v: TokenPricingFormFields) => v.tokenPricingMode === 'dinamico',
      visibleWhen: ['tokenPricingMode'],
    },
    {
      name: 'kdField' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-1',
      visible: (v: TokenPricingFormFields) => v.tokenPricingMode === 'dinamico',
      render: (methods: UseFormReturn<ProductOfferingPriceFormData>) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Sensibilidad a la demanda</span>
          <Segmented
            value={String(methods.watch('tokenKd') ?? 0.6)}
            onChange={(v) => methods.setValue('tokenKd', Number(v))}
            options={KD_OPTIONS}
            aria-label="Sensibilidad a la demanda"
          />
        </div>
      ),
    },
    {
      name: 'gammaField' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-1',
      visible: (v: TokenPricingFormFields) => v.tokenPricingMode === 'dinamico',
      render: (methods: UseFormReturn<ProductOfferingPriceFormData>) => (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700">Curva de escasez</span>
          <Segmented
            value={String(methods.watch('tokenGamma') ?? 1)}
            onChange={(v) => methods.setValue('tokenGamma', Number(v))}
            options={GAMMA_OPTIONS}
            aria-label="Curva de escasez"
          />
        </div>
      ),
    },
    // — Tax —
    {
      name: 'conditions-separator' as const,
      type: 'custom' as const,
      wrapperClassName: 'col-span-2',
      render: () => (
        <div className="border-t border-gray-lightest pt-4">
          <Typography as="h3" variant="form-label" color="primary" className="font-semibold">
            Fiscal
          </Typography>
        </div>
      ),
    },
    // {
    //   name: 'productOfferingTerm-section',
    //   type: 'offering-terms' as const,
    //   wrapperClassName: 'col-span-2',
    // },
    { name: 'tax-section', type: 'tax' as const, wrapperClassName: 'col-span-2' },
  ];

  if (isEditing) {
    return (
      <SmartForm<UpdateProductOfferingPriceFormData>
        key={editingPrice.id}
        fields={
          baseFields as Parameters<
            typeof SmartForm<UpdateProductOfferingPriceFormData>
          >[0]['fields']
        }
        columns={2}
        schema={updateProductOfferingPriceSchema}
        defaultValues={{
          name: editingPrice.name ?? '',
          description: editingPrice.description ?? '',
          priceType: 'one time',
          price: editingPrice.price ? { value: editingPrice.price.value } : undefined,
          tax: (editingPrice.tax ?? []).map((t) => ({
            taxCategory: t.taxCategory ?? '',
            taxRate: t.taxRate ?? 0,
          })),
          // productOfferingTerm: (editingPrice.productOfferingTerm ?? []).map((t) => ({
          //   name: t.name ?? '',
          //   description: t.description,
          //   duration: t.duration
          //     ? {
          //         amount: t.duration.amount ?? 12,
          //         units: (t.duration.units ?? 'month') as 'day' | 'month' | 'year',
          //       }
          //     : undefined,
          // })),
          ...(() => {
            const params = parseTokenPricingParams(editingPrice);
            return params
              ? {
                  tokenPricingMode: 'dinamico' as const,
                  tokenSupplyMode: params.N ? ('escaso' as const) : ('abundante' as const),
                  tokenSupply: params.N,
                  tokenGamma: params.gamma,
                  tokenKd: params.kd,
                  tokenFloor: params.floor,
                  tokenCap: params.cap,
                }
              : { tokenPricingMode: 'fijo' as const, tokenSupplyMode: 'abundante' as const };
          })(),
        }}
        resetOnSubmit={false}
        onSubmit={async (data) => {
          await patchMutation.mutateAsync({
            id: editingPrice.id!,
            payload: {
              ...withDisabledFieldDefaults(omitTokenFormFields(data)),
              ...buildTokenPricingPatch(data),
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
    <SmartForm<ProductOfferingPriceFormData>
      fields={baseFields as Parameters<typeof SmartForm<ProductOfferingPriceFormData>>[0]['fields']}
      columns={2}
      schema={productOfferingPriceSchema}
      defaultValues={{
        priceType: 'one time',
        tokenPricingMode: 'fijo',
        tokenSupplyMode: 'abundante',
      }}
      onSubmit={async (data) => {
        await createMutation.mutateAsync({
          ...withDisabledFieldDefaults(omitTokenFormFields(data)),
          ...buildTokenPricingPatch(data),
        });
        onClose();
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={isPending ? 'Creando…' : 'Crear precio'}
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

export default PriceForm;
