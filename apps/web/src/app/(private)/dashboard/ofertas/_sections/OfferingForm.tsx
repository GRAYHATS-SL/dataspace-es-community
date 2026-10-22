'use client';

import { useMemo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import { PRICE_TYPE_LABELS } from '@/components/molecules/TableRow';
import SmartForm from '@/components/organisms/SmartForm';
import { useLaunchedCategories } from '@/hooks/queries/useCategoryQueries';
import {
  useCreateProductOfferingPrice,
  useOwnProductOfferingPrices,
} from '@/hooks/queries/useProductOfferingPriceQueries';
import {
  useAddOfferingPriceRef,
  useCreateProductOffering,
  usePatchProductOffering,
  usePatchProductOfferingCategories,
  useProductOffering,
  useRemoveOfferingPriceRef,
  useSetOfferingPriceRefs,
} from '@/hooks/queries/useProductOfferingQueries';
import { useProductSpecifications } from '@/hooks/queries/useProductSpecificationQueries';
import { LIFECYCLE_OPTIONS } from '@/lib/constants/lifecycle';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  ProductOfferingFormData,
  productOfferingSchema,
  UpdateProductOfferingFormData,
  updateProductOfferingSchema,
} from '@/lib/validations/productOffering.schema';
import {
  ProductOfferingPriceFormData,
  productOfferingPriceSchema,
} from '@/lib/validations/productOfferingPrice.schema';
import type { NewProductOffering, ProductOffering } from '@/types/api';

import { PRICE_TYPE_OPTIONS } from './constants';

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

// ---------------------------------------------------------------------------
// Price management sub-section (post-creation flow)
// ---------------------------------------------------------------------------

const PriceManagementSection = ({ offeringId }: Readonly<{ offeringId: string }>) => {
  const { data: liveOffering } = useProductOffering(offeringId);
  const { data: allPrices = [] } = useOwnProductOfferingPrices();
  const createPriceMutation = useCreateProductOfferingPrice();
  const addPriceRefMutation = useAddOfferingPriceRef();
  const removePriceRefMutation = useRemoveOfferingPriceRef();
  const [selectedExistingPriceId, setSelectedExistingPriceId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const priceRefs = liveOffering?.productOfferingPrice ?? [];
  const linkedPrices = priceRefs
    .map((ref) => allPrices.find((p) => p.id === ref.id))
    .filter(Boolean) as (typeof allPrices)[number][];
  const availablePrices = allPrices.filter((p) => !priceRefs.some((ref) => ref.id === p.id));
  const currentPriceRefs = priceRefs.map(({ id, href, name }) => ({ id, href, name }));

  const isAddingPrice = createPriceMutation.isPending || addPriceRefMutation.isPending;
  const isRemovingPrice = removePriceRefMutation.isPending;

  return (
    <div className="border-t border-gray-lightest pt-5">
      <Typography as="h4" variant="small" className="mb-3 font-semibold text-primary">
        Precios vinculados
      </Typography>

      {linkedPrices.length === 0 && (
        <Typography variant="small" color="gray" className="mb-4">
          Sin precios vinculados.
        </Typography>
      )}

      {linkedPrices.length > 0 && (
        <ul className="mb-5 space-y-1.5">
          {linkedPrices.map((price) => (
            <li
              key={price.id}
              className="flex items-center justify-between rounded-lg border border-gray-lightest bg-white px-3 py-2 text-xs"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-primary">{price.name}</span>
                <span className="text-gray">
                  {PRICE_TYPE_LABELS[price.priceType ?? ''] ?? price.priceType}
                  {price.price ? ` · ${price.price.value} ${price.price.unit}` : ''}
                </span>
              </div>
              <button
                onClick={() =>
                  removePriceRefMutation.mutate({
                    offeringId,
                    priceId: price.id!,
                    currentPrices: currentPriceRefs,
                  })
                }
                disabled={isRemovingPrice}
                title="Desvincular precio"
                className="flex items-center justify-center min-h-11 min-w-11 rounded text-danger hover:bg-danger/10 disabled:cursor-default disabled:opacity-40"
              >
                <Icon name="X" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {availablePrices.length > 0 && (
        <div className="mb-5">
          <Typography as="h4" variant="small" className="mb-2 font-semibold text-primary">
            Vincular precio existente
          </Typography>
          <div className="flex gap-2">
            <select
              value={selectedExistingPriceId}
              onChange={(e) => setSelectedExistingPriceId(e.target.value)}
              className="flex-1 rounded-md border border-gray-lightest bg-white px-3 py-1.5 text-xs text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Selecciona un precio…</option>
              {availablePrices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.priceType ? ` · ${PRICE_TYPE_LABELS[p.priceType] ?? p.priceType}` : ''}
                  {p.price ? ` · ${p.price.value} ${p.price.unit}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!selectedExistingPriceId) return;
                addPriceRefMutation.mutate(
                  { offeringId, priceId: selectedExistingPriceId, currentPrices: currentPriceRefs },
                  { onSuccess: () => setSelectedExistingPriceId('') },
                );
              }}
              disabled={!selectedExistingPriceId || isAddingPrice}
              className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:cursor-default disabled:opacity-40"
            >
              {isAddingPrice ? 'Vinculando…' : 'Vincular'}
            </button>
          </div>
        </div>
      )}

      <Typography as="h4" variant="small" className="mb-2 font-semibold text-primary">
        Crear y añadir precio
      </Typography>
      <SmartForm<ProductOfferingPriceFormData>
        fields={[
          {
            name: 'name',
            type: 'text',
            label: 'Nombre',
            required: true,
            wrapperClassName: 'col-span-1',
          },
          {
            name: 'priceType',
            type: 'select',
            label: 'Tipo',
            required: true,
            wrapperClassName: 'col-span-1',
            options: PRICE_TYPE_OPTIONS,
            placeholder: 'Selecciona un tipo',
          },
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
            label: 'Moneda (ej. EUR)',
            required: true,
            wrapperClassName: 'col-span-1',
            placeholder: 'EUR',
          },
          {
            name: 'recurringChargePeriodType',
            type: 'text',
            label: 'Período de cobro (ej. month)',
            wrapperClassName: 'col-span-1',
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
        ]}
        columns={2}
        schema={productOfferingPriceSchema}
        onSubmit={async (data) => {
          const price = await createPriceMutation.mutateAsync(data);
          if (price.id) {
            await addPriceRefMutation.mutateAsync({
              offeringId,
              priceId: price.id,
              currentPrices: currentPriceRefs,
            });
          }
        }}
        onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
        submitText={isAddingPrice ? 'Añadiendo…' : 'Añadir precio'}
        loading={isAddingPrice}
        resetOnSubmit
        renderActions={({ isSubmitting }) => (
          <button
            type="submit"
            disabled={isSubmitting || isAddingPrice}
            className="rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary/90 disabled:cursor-default disabled:opacity-40"
          >
            {isAddingPrice ? 'Añadiendo…' : 'Añadir precio'}
          </button>
        )}
      >
        {submitError && (
          <Typography variant="small" className="text-danger" role="alert">
            {submitError}
          </Typography>
        )}
      </SmartForm>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface OfferingFormProps {
  onClose: () => void;
  editingOffering?: ProductOffering | null;
}

const OfferingForm = ({ onClose, editingOffering }: Readonly<OfferingFormProps>) => {
  const isEditing = !!editingOffering;
  const [createdOfferingId, setCreatedOfferingId] = useState<string | null>(null);

  const createMutation = useCreateProductOffering();
  const patchMutation = usePatchProductOffering();
  const setCategoriesMutation = usePatchProductOfferingCategories();
  const setOfferingPriceRefsMutation = useSetOfferingPriceRefs();
  const { data: productSpecs = [] } = useProductSpecifications();
  const { data: launchedCategories = [] } = useLaunchedCategories();
  const { data: allPrices = [] } = useOwnProductOfferingPrices();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const specOptions = useMemo(
    () =>
      productSpecs
        .map((ps) => ({ label: ps.name ?? ps.id ?? '', value: ps.id ?? '' }))
        .filter((o) => o.value),
    [productSpecs],
  );
  const categoryOptions = useMemo(
    () =>
      launchedCategories
        .map((c) => ({ label: c.name ?? c.id ?? '', value: c.id ?? '' }))
        .filter((o) => o.value),
    [launchedCategories],
  );
  const priceOptions = useMemo(
    () =>
      allPrices
        .map((p) => {
          const amount =
            p.price?.value == null ? undefined : `${p.price.value} ${p.price.unit ?? ''}`.trim();
          const description = [p.priceType, amount].filter(Boolean).join(' · ') || undefined;
          return { label: p.name ?? p.id ?? '', value: p.id ?? '', description };
        })
        .filter((o) => o.value),
    [allPrices],
  );

  if (isEditing) {
    const isPending =
      patchMutation.isPending ||
      setCategoriesMutation.isPending ||
      setOfferingPriceRefsMutation.isPending;

    return (
      <SmartForm<UpdateProductOfferingFormData>
        key={editingOffering.id}
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
          {
            name: 'description',
            type: 'textarea',
            label: 'Descripción',
            wrapperClassName: 'col-span-2',
            props: { rows: 2 },
          },
          // — Linking —
          {
            name: 'link-separator-edit',
            type: 'custom',
            wrapperClassName: 'col-span-2',
            render: () => (
              <SectionSeparator
                title="Vinculación"
                description="Asocia esta oferta a una especificación y una categoría del catálogo."
              />
            ),
          },
          {
            name: 'productSpecification',
            type: 'select',
            label: 'Especificación de producto',
            wrapperClassName: 'col-span-1',
            options: specOptions,
            placeholder: 'Selecciona una especificación',
          },
          {
            name: 'category',
            type: 'select',
            label: 'Categoría',
            wrapperClassName: 'col-span-1',
            options: categoryOptions,
            placeholder: 'Selecciona una categoría',
          },
          // — Prices —
          {
            name: 'commercial-separator-edit',
            type: 'custom',
            wrapperClassName: 'col-span-2',
            render: () => (
              <SectionSeparator
                title="Precios"
                description="Precios vinculados a esta oferta."
              />
            ),
          },
          {
            name: 'productOfferingPrice',
            type: 'multiselect',
            label: 'Precios vinculados',
            wrapperClassName: 'col-span-2',
            options: priceOptions,
          },
          // {
          //   name: 'productOfferingTerm-section',
          //   type: 'offering-terms' as const,
          //   wrapperClassName: 'col-span-2',
          // },
          // {
          //   name: 'place-section',
          //   type: 'tag-input' as const,
          //   fieldName: 'place',
          //   label: 'Disponibilidad geográfica',
          //   placeholder: 'Ej: España, Europa…',
          //   hint: 'Pulsa Enter o el botón para añadir una región.',
          //   wrapperClassName: 'col-span-2',
          // },
        ]}
        columns={2}
        schema={updateProductOfferingSchema}
        defaultValues={{
          name: editingOffering.name ?? '',
          description: editingOffering.description ?? '',
          lifecycleStatus: editingOffering.lifecycleStatus,
          productSpecification: editingOffering.productSpecification?.id ?? '',
          category: editingOffering.category?.[0]?.id ?? '',
          productOfferingPrice: (editingOffering.productOfferingPrice ?? [])
            .map((p) => p.id)
            .filter(Boolean) as string[],
          // productOfferingTerm: (editingOffering.productOfferingTerm ?? []).map((t) => ({
          //   name: t.name ?? '',
          //   description: t.description ?? '',
          //   duration: t.duration
          //     ? {
          //         amount: t.duration.amount ?? 1,
          //         units: (t.duration.units ?? 'month') as 'day' | 'month' | 'year',
          //       }
          //     : undefined,
          // })),
        }}
        resetOnSubmit={false}
        onSubmit={async (data) => {
          const selectedSpec = productSpecs.find((ps) => ps.id === data.productSpecification);
          const payload: Parameters<typeof patchMutation.mutate>[0]['payload'] = {
            ...(data.name && { name: data.name.trim() }),
            description: data.description?.trim() || undefined,
            lifecycleStatus: data.lifecycleStatus,
            // productOfferingTerm: data.productOfferingTerm?.length
            //   ? data.productOfferingTerm
            //   : undefined,
            // place: data.place?.length ? data.place.map((p) => ({ id: p, name: p })) : undefined,
            ...(selectedSpec?.id && {
              productSpecification: {
                id: selectedSpec.id!,
                href: selectedSpec.href,
                name: selectedSpec.name,
              },
            }),
          };
          await patchMutation.mutateAsync({ id: editingOffering.id!, payload });
          await setCategoriesMutation.mutateAsync({
            id: editingOffering.id!,
            categoryIds: data.category ? [data.category] : [],
          });
          await setOfferingPriceRefsMutation.mutateAsync({
            id: editingOffering.id!,
            priceIds: data.productOfferingPrice ?? [],
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

  if (createdOfferingId) {
    return (
      <div className="space-y-4">
        <Typography variant="small" color="gray">
          Oferta creada. Añade precios ahora o hazlo más tarde desde edición.
        </Typography>
        <PriceManagementSection offeringId={createdOfferingId} />
        <div className="flex justify-end pt-2">
          <Button variant="primary" size="md" onClick={onClose}>
            Finalizar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SmartForm<ProductOfferingFormData>
      fields={[
        // — Basic information —
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
        // — Linking —
        {
          name: 'link-separator-create',
          type: 'custom',
          wrapperClassName: 'col-span-2',
          render: () => (
            <SectionSeparator
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
          options: specOptions,
          placeholder: 'Selecciona una especificación',
        },
        {
          name: 'category',
          type: 'select',
          label: 'Categoría',
          wrapperClassName: 'col-span-1',
          options: categoryOptions,
          placeholder: 'Selecciona una categoría',
        },
        // — Prices —
        {
          name: 'commercial-separator-create',
          type: 'custom',
          wrapperClassName: 'col-span-2',
          render: () => <SectionSeparator title="Precios" description="Precios vinculados a esta oferta." />,
        },
        {
          name: 'productOfferingPrice',
          type: 'multiselect',
          label: 'Precios vinculados',
          wrapperClassName: 'col-span-2',
          options: priceOptions,
        },
        // {
        //   name: 'productOfferingTerm-section',
        //   type: 'offering-terms' as const,
        //   wrapperClassName: 'col-span-2',
        // },
        // {
        //   name: 'place-section',
        //   type: 'tag-input' as const,
        //   fieldName: 'place',
        //   label: 'Disponibilidad geográfica',
        //   placeholder: 'Ej: España, Europa…',
        //   hint: 'Pulsa Enter o el botón para añadir una región.',
        //   wrapperClassName: 'col-span-2',
        // },
      ]}
      columns={2}
      schema={productOfferingSchema}
      onSubmit={async (data) => {
        const selectedSpec = productSpecs.find((ps) => ps.id === data.productSpecification);
        const selectedCategory = data.category ?? '';
        const selectedPrices = data.productOfferingPrice ?? [];
        const offering = await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
          isSellable: true,
          lifecycleStatus: data.lifecycleStatus,
          // productOfferingTerm: data.productOfferingTerm?.length
          //   ? data.productOfferingTerm
          //   : undefined,
          // place: data.place?.length ? data.place.map((p) => ({ id: p, name: p })) : undefined,
          // No category in the POST — it is assigned with setCategoriesMutation (one-per-PATCH) to avoid creating NGSI-LD Relationship nodes that break later edits.
          productSpecification: selectedSpec
            ? { id: selectedSpec.id, href: selectedSpec.href, name: selectedSpec.name }
            : undefined,
        } as NewProductOffering);

        if (!offering.id) return;

        if (selectedCategory) {
          await setCategoriesMutation.mutateAsync({
            id: offering.id,
            categoryIds: [selectedCategory],
          });
        }

        if (selectedPrices.length > 0) {
          await setOfferingPriceRefsMutation.mutateAsync({
            id: offering.id,
            priceIds: selectedPrices,
          });
          onClose();
        } else {
          setCreatedOfferingId(offering.id);
        }
      }}
      onSubmitError={(error) => setSubmitError(getErrorMessage(error))}
      submitText={createMutation.isPending ? 'Creando…' : 'Crear oferta'}
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

export default OfferingForm;
