'use client';

import Badge from '@/components/atoms/Badge';
import Card from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import Breadcrumb from '@/components/molecules/Breadcrumb';
import OfferingPolicyContent from '@/components/molecules/OfferingPolicyContent';
import OfferingBuyBox from '@/components/organisms/OfferingBuyBox';
import OfferingComments, {
  CommentsSummary,
  summarizeComments,
} from '@/components/organisms/OfferingComments';
import {
  useOfferingComments,
  useProductOffering,
  useProductOfferingPrices,
  useProductSpecification,
  useResourceSpecifications,
  useServiceSpecifications,
} from '@/hooks/queries';
import { useIsOwnOffering } from '@/hooks/useIsOwnOffering';
import {
  extractSpecMetadata,
  getOfferingPrices,
  type SpecMetadata,
} from '@/lib/utils/offeringMetadata';
import type { ProductOffering, ProductSpecification } from '@/types/api';

interface OfferingDetailClientProps {
  offeringId: string;
}

const PRICE_TYPE_LABELS: Record<string, string> = {
  free: 'Gratuito',
  'one time': 'Pago único',
  recurring: 'Suscripción',
  usage: 'Por uso',
};

function OfferingDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]" role="status" aria-label="Cargando">
      <div className="flex flex-col gap-6">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function OfferingNotAvailable({ message }: Readonly<{ message?: string }>) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon name="Package" size={32} className="text-gray-200" aria-hidden="true" />
      <Typography variant="small" color="gray">
        No se pudo cargar esta oferta de producto.
      </Typography>
      {message && <Typography variant="form-hint">{message}</Typography>}
      <Link href="/catalogo" variant="primary">
        Volver al catálogo
      </Link>
    </div>
  );
}

function OfferingHeader({
  offering,
  offeringId,
}: Readonly<{ offering: ProductOffering; offeringId: string }>) {
  const { data: comments = [] } = useOfferingComments(offeringId);
  const { average, count } = summarizeComments(comments);
  const categories = offering.category ?? [];
  return (
    <Card variant="outlined" radius="xl">
      <div className="mb-3 flex flex-wrap gap-2">
        {categories.length > 0 ? (
          categories.map((cat) => (
            <Badge key={cat.id} variant="alt">
              {cat.name ?? cat.id}
            </Badge>
          ))
        ) : (
          <Badge variant="alt">Sin categoría</Badge>
        )}
        {offering.lifecycleStatus && <Badge variant="outline">{offering.lifecycleStatus}</Badge>}
      </div>
      <Typography as="h1" variant="title" color="primary" className="mb-2">
        {offering.name ?? 'Oferta sin nombre'}
      </Typography>
      <div className="mb-3">
        <CommentsSummary average={average} count={count} />
      </div>
      {offering.description && (
        <Typography variant="body" color="gray">
          {offering.description}
        </Typography>
      )}
    </Card>
  );
}

function TechSpecSection({
  spec,
  metadata,
}: Readonly<{ spec: ProductSpecification | undefined; metadata: SpecMetadata }>) {
  const { data: resourceSpecs = [] } = useResourceSpecifications();
  const { data: serviceSpecs = [] } = useServiceSpecifications();
  const resourceById = new Map(resourceSpecs.map((r) => [r.id, r.name]));
  const serviceById = new Map(serviceSpecs.map((s) => [s.id, s.name]));

  const refNames = [
    ...(spec?.resourceSpecification ?? []).map((r) => r.name ?? resourceById.get(r.id) ?? r.id),
    ...(spec?.serviceSpecification ?? []).map((s) => s.name ?? serviceById.get(s.id) ?? s.id),
  ].filter(Boolean);

  const chips = [
    { label: 'Referencia', value: metadata.productNumber },
  ].filter((c) => c.value);

  if (chips.length === 0 && refNames.length === 0) return null;

  return (
    <Card variant="outlined" radius="xl">
      <Typography as="h2" variant="title" color="primary" className="mb-4">
        Especificación técnica
      </Typography>
      {chips.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {chips.map((chip) => (
            <div key={chip.label} className="space-y-1">
              <Typography variant="metadata-label" color="gray-light">
                {chip.label}
              </Typography>
              <Typography variant="metadata-value" color="black">
                {chip.value}
              </Typography>
            </div>
          ))}
        </div>
      )}
      {refNames.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {refNames.map((name, i) => (
            <Badge key={`${name}-${i}`} variant="alt">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

function CommercialTermsSection({ offering }: Readonly<{ offering: ProductOffering }>) {
  const { data: allPrices = [], isError } = useProductOfferingPrices();
  const linkedPrices = getOfferingPrices(offering, allPrices);
  const terms = (offering.productOfferingTerm ?? []).filter((t) => t.name);
  const places = (offering.place ?? []).map((p) => p.name ?? p.id).filter(Boolean);

  if (linkedPrices.length === 0 && terms.length === 0 && places.length === 0) return null;

  return (
    <Card variant="outlined" radius="xl">
      <Typography as="h2" variant="title" color="primary" className="mb-4">
        Condiciones comerciales
      </Typography>
      <div className="flex flex-col gap-4">
        {isError && (
          <Typography variant="small" color="danger" role="alert">
            No se pudieron cargar los precios.
          </Typography>
        )}
        {linkedPrices.map((price) => (
          <div
            key={price.id}
            className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <div>
              <Typography variant="metadata-value" color="black">
                {price.name}
              </Typography>
              <Typography variant="metadata-label" color="gray-light">
                {PRICE_TYPE_LABELS[price.priceType?.toLowerCase() ?? ''] ?? price.priceType}
              </Typography>
            </div>
            {price.price?.value != null && (
              <Typography variant="metadata-value" color="black">
                {price.price.value.toLocaleString('es-ES')} {price.price.unit}
              </Typography>
            )}
          </div>
        ))}
        {terms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {terms.map((term) => (
              <Badge key={term.name} variant="alt">
                {term.name}
              </Badge>
            ))}
          </div>
        )}
        {places.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Icon name="MapPin" size={14} aria-hidden="true" />
            {places.join(', ')}
          </div>
        )}
      </div>
    </Card>
  );
}

function AccessPolicySection({
  specId,
  specLoading,
  accessExpiresAt,
}: Readonly<{ specId: string | undefined; specLoading: boolean; accessExpiresAt: string }>) {
  return (
    <Card variant="outlined" radius="xl">
      <Typography
        as="h2"
        variant="title"
        color="primary"
        className="mb-4 flex items-center gap-2"
      >
        <Icon name="ShieldCheck" size={18} aria-hidden="true" />
        Política de acceso
      </Typography>
      <OfferingPolicyContent
        specId={specId}
        specLoading={specLoading}
        accessExpiresAt={accessExpiresAt}
      />
    </Card>
  );
}

function OfferingDetail({ offeringId }: Readonly<{ offeringId: string }>) {
  const { data: offering, isLoading, isError, error } = useProductOffering(offeringId);
  const specId = offering?.productSpecification?.id ?? '';
  const { data: spec, isLoading: specLoading } = useProductSpecification(specId);
  const { isOwnOffering } = useIsOwnOffering();

  if (isLoading) return <OfferingDetailSkeleton />;
  if (isError || !offering) return <OfferingNotAvailable message={error?.message} />;

  const metadata = extractSpecMetadata(spec);

  return (
    <>
      <Breadcrumb
        items={[{ label: 'Catálogo', href: '/catalogo' }, { label: offering.name ?? 'Oferta' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <OfferingHeader offering={offering} offeringId={offeringId} />
          <TechSpecSection spec={spec} metadata={metadata} />
          <CommercialTermsSection offering={offering} />
          <AccessPolicySection
            specId={specId || undefined}
            specLoading={specLoading}
            accessExpiresAt={metadata.accessExpiresAt}
          />
          <Card variant="outlined" radius="xl">
            <OfferingComments offeringId={offeringId} />
          </Card>
        </div>

        <aside>
          <OfferingBuyBox
            offering={offering}
            publisher={spec?.brand}
            isOwnOffering={isOwnOffering(offering)}
          />
        </aside>
      </div>
    </>
  );
}

export default function OfferingDetailClient({ offeringId }: Readonly<OfferingDetailClientProps>) {
  return (
    <div className="py-8">
      <Container>
        <OfferingDetail offeringId={offeringId} />
      </Container>
    </div>
  );
}
