'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import Segmented, { type SegmentedOption } from '@/components/atoms/Segmented';
import Typography from '@/components/atoms/Typography';
import FormSectionSeparator from '@/components/molecules/FormSectionSeparator';
import SmartForm, { type SmartFormField } from '@/components/organisms/SmartForm';
import { useCreateProductOfferingPrice, usePatchProductOfferingPrice } from '@/hooks/queries';
import { PRICE_TYPE_OPTIONS } from '@/lib/constants/productSpec';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  PRICE_TYPES,
  type ProductOfferingPriceFormData,
  productOfferingPriceSchema,
} from '@/lib/validations/productOfferingPrice.schema';
import type { NewProductOfferingPrice, ProductOfferingPrice } from '@/types/api';

type FormData = ProductOfferingPriceFormData;
type Methods = UseFormReturn<FormData>;
type FormField = SmartFormField<FormData>;

/** Props of `PriceForm`. */
export interface PriceFormProps {
  onClose: () => void;
  onSuccess?: (price: ProductOfferingPrice) => void;
  editingPrice?: ProductOfferingPrice | null;
  /** Compact mode (embedded in another form): hides the dynamic pricing section and uses an inline submit button. */
  compact?: boolean;
}

const PRICING_MODE_OPTIONS: SegmentedOption<'fixed' | 'dynamic'>[] = [
  { value: 'fixed', label: 'Fijo' },
  { value: 'dynamic', label: 'Cotización dinámica' },
];
const SUPPLY_MODE_OPTIONS: SegmentedOption<'limited' | 'unlimited'>[] = [
  { value: 'limited', label: 'Limitado' },
  { value: 'unlimited', label: 'Ilimitado' },
];
const CURVE_OPTIONS: SegmentedOption<string>[] = [
  { value: '1', label: 'Lineal' },
  { value: '2', label: 'Convexa' },
];
const SENSITIVITY_OPTIONS: SegmentedOption<string>[] = [
  { value: '0.5', label: 'Baja' },
  { value: '1', label: 'Media' },
  { value: '1.5', label: 'Alta' },
];

/** Maps the form values to the price payload (form-only fields are dropped). */
function buildPricePayload(data: FormData): Partial<NewProductOfferingPrice> {
  // Here you define your pricing rules (dynamic pricing algorithm, derived price type...).
  return {
    name: data.name.trim(),
    description: data.description?.trim() || undefined,
    priceType: data.priceType,
    price: { value: data.price.value, unit: data.price.unit },
    recurringChargePeriodType:
      data.priceType === 'recurring' ? data.recurringChargePeriodType : undefined,
    recurringChargePeriodLength:
      data.priceType === 'recurring' ? data.recurringChargePeriodLength : undefined,
    tax: data.tax,
  };
}

/** Reads the dynamic pricing fields of an existing price back into the form. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractPricingFields(_price: ProductOfferingPrice): Partial<FormData> {
  // Here you define your pricing rules (inverse of `buildPricePayload`).
  return { pricingMode: 'fixed', supplyMode: 'unlimited' };
}

/** Initial values of the form (create or edit). */
function getDefaultValues(price?: ProductOfferingPrice | null): Partial<FormData> {
  if (!price) {
    // Here you define your business logic (default price type, currency...).
    return { priceType: 'one time', pricingMode: 'fixed', supplyMode: 'unlimited', tax: [] };
  }
  return {
    name: price.name ?? '',
    description: price.description ?? '',
    priceType: PRICE_TYPES.find((t) => t === price.priceType),
    price: { value: price.price?.value ?? 0, unit: price.price?.unit ?? 'EUR' },
    recurringChargePeriodType: price.recurringChargePeriodType,
    recurringChargePeriodLength: price.recurringChargePeriodLength,
    tax: (price.tax ?? []).map((t) => ({ taxCategory: t.taxCategory ?? '', taxRate: t.taxRate ?? 0 })),
    ...extractPricingFields(price),
  };
}

const separator = (name: string, title: string, description?: string): FormField => ({
  name,
  type: 'custom',
  wrapperClassName: 'col-span-2',
  render: () => <FormSectionSeparator title={title} description={description} />,
});

const segmentedField = (
  name: string,
  label: string,
  render: (methods: Methods) => React.ReactNode,
  wrapperClassName = 'col-span-1',
): FormField => ({
  name,
  type: 'custom',
  wrapperClassName,
  visible: (v) => v.pricingMode === 'dynamic',
  visibleWhen: ['pricingMode'],
  render: (methods) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {render(methods)}
    </div>
  ),
});

const isDynamic = (v: FormData) => v.pricingMode === 'dynamic';

const BASE_FIELDS: FormField[] = [
  { name: 'name', type: 'text', label: 'Nombre', required: true, wrapperClassName: 'col-span-1' },
  {
    name: 'priceType',
    type: 'select',
    label: 'Tipo de precio',
    required: true,
    placeholder: 'Selecciona un tipo',
    wrapperClassName: 'col-span-1',
    options: PRICE_TYPE_OPTIONS,
  },
  {
    name: 'description',
    type: 'text',
    label: 'Descripción (qué incluye este precio)',
    wrapperClassName: 'col-span-2',
  },
  separator('amount-separator', 'Importe'),
  {
    name: 'price.value',
    type: 'text',
    label: 'Importe',
    required: true,
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 0, step: '0.01' },
  },
  {
    name: 'price.unit',
    type: 'text',
    label: 'Moneda',
    required: true,
    placeholder: 'EUR',
    wrapperClassName: 'col-span-1',
  },
  {
    name: 'recurringChargePeriodType',
    type: 'select',
    label: 'Período de cobro',
    placeholder: 'Selecciona un período',
    wrapperClassName: 'col-span-1',
    options: [
      { label: 'Día', value: 'day' },
      { label: 'Semana', value: 'week' },
      { label: 'Mes', value: 'month' },
      { label: 'Año', value: 'year' },
    ],
    visible: (v) => v.priceType === 'recurring',
    visibleWhen: ['priceType'],
  },
  {
    name: 'recurringChargePeriodLength',
    type: 'text',
    label: 'Duración del período',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 1 },
    visible: (v) => v.priceType === 'recurring',
    visibleWhen: ['priceType'],
  },
];

const DYNAMIC_FIELDS: FormField[] = [
  separator(
    'dynamic-separator',
    'Cotización dinámica',
    'Opcional: el importe se recalcula dentro de un rango según la demanda y el suministro.',
  ),
  {
    name: 'pricingModeField',
    type: 'custom',
    wrapperClassName: 'col-span-2',
    render: (methods) => (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700">Modo de precio</span>
        <Segmented
          value={methods.watch('pricingMode') ?? 'fixed'}
          onChange={(v) => methods.setValue('pricingMode', v, { shouldValidate: true })}
          options={PRICING_MODE_OPTIONS}
          aria-label="Modo de precio"
        />
      </div>
    ),
  },
  segmentedField('supplyModeField', 'Suministro', (methods) => (
    <Segmented
      value={methods.watch('supplyMode') ?? 'unlimited'}
      onChange={(v) => {
        methods.setValue('supplyMode', v);
        if (v === 'unlimited') methods.setValue('supply', undefined);
      }}
      options={SUPPLY_MODE_OPTIONS}
      aria-label="Suministro"
    />
  )),
  {
    name: 'supply',
    type: 'text',
    label: 'Unidades a emitir',
    wrapperClassName: 'col-span-2',
    props: { type: 'number', min: 1, step: 1 },
    visible: (v) => isDynamic(v) && v.supplyMode === 'limited',
    visibleWhen: ['pricingMode', 'supplyMode'],
  },
  {
    name: 'floor',
    type: 'text',
    label: 'Suelo',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 0, step: '0.01' },
    visible: isDynamic,
    visibleWhen: ['pricingMode'],
  },
  {
    name: 'cap',
    type: 'text',
    label: 'Techo',
    wrapperClassName: 'col-span-1',
    props: { type: 'number', min: 0, step: '0.01' },
    visible: isDynamic,
    visibleWhen: ['pricingMode'],
  },
  segmentedField('sensitivityField', 'Sensibilidad a la demanda', (methods) => (
    <Segmented
      value={String(methods.watch('sensitivity') ?? 1)}
      onChange={(v) => methods.setValue('sensitivity', Number(v))}
      options={SENSITIVITY_OPTIONS}
      aria-label="Sensibilidad a la demanda"
    />
  )),
  segmentedField('curveField', 'Curva de escasez', (methods) => (
    <Segmented
      value={String(methods.watch('curve') ?? 1)}
      onChange={(v) => methods.setValue('curve', Number(v))}
      options={CURVE_OPTIONS}
      aria-label="Curva de escasez"
    />
  )),
];

const TAX_FIELDS: FormField[] = [
  separator('conditions-separator', 'Fiscal'),
  { name: 'tax-section', type: 'tax', wrapperClassName: 'col-span-2' },
];

/** Create/edit form of a product offering price (amount, recurrence, dynamic pricing, taxes). */
const PriceForm = ({
  onClose,
  onSuccess,
  editingPrice,
  compact = false,
}: Readonly<PriceFormProps>) => {
  const createMutation = useCreateProductOfferingPrice();
  const patchMutation = usePatchProductOfferingPrice();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!editingPrice?.id;
  const isPending = createMutation.isPending || patchMutation.isPending;
  const idleLabel = isEditing ? 'Guardar cambios' : 'Crear precio';
  const fields = compact
    ? [...BASE_FIELDS, ...TAX_FIELDS]
    : [...BASE_FIELDS, ...DYNAMIC_FIELDS, ...TAX_FIELDS];

  const handleSubmit = async (data: FormData) => {
    setSubmitError(null);
    const payload = buildPricePayload(data);
    const price =
      isEditing && editingPrice.id
        ? await patchMutation.mutateAsync({ id: editingPrice.id, payload })
        : await createMutation.mutateAsync(payload);
    onSuccess?.(price);
    onClose();
  };

  return (
    <SmartForm<FormData>
      key={editingPrice?.id ?? 'new'}
      fields={fields}
      columns={2}
      schema={productOfferingPriceSchema}
      defaultValues={getDefaultValues(editingPrice)}
      onSubmit={handleSubmit}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={isPending ? 'Guardando…' : idleLabel}
      loading={isPending}
      onCancel={compact ? undefined : onClose}
      resetOnSubmit={!isEditing}
      renderActions={
        compact
          ? ({ isSubmitting }) => (
              <button
                type="submit"
                disabled={isSubmitting || isPending}
                className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:cursor-default disabled:opacity-40"
              >
                {isPending ? 'Añadiendo…' : 'Añadir precio'}
              </button>
            )
          : undefined
      }
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
