'use client';

import Badge from '@/components/atoms/Badge';
import Card from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import Breadcrumb from '@/components/molecules/Breadcrumb';
import DataQualityBadge from '@/components/molecules/DataQualityBadge';
import DataQualityRadarChart from '@/components/molecules/DataQualityRadarChart';
import OfferingPolicyContent from '@/components/molecules/OfferingPolicyContent';
import { PRICE_TYPE_LABELS } from '@/components/molecules/TableRow';
import OfferingBuyBox from '@/components/organisms/OfferingBuyBox';
import OfferingComments, { CommentsSummary } from '@/components/organisms/OfferingComments';
import { useOfferingComments, useProductOffering } from '@/hooks/queries';
import { useOrganizations } from '@/hooks/queries/usePartyQueries';
import { useProductOfferingPrices } from '@/hooks/queries/useProductOfferingPriceQueries';
import { useProductSpecification } from '@/hooks/queries/useProductSpecificationQueries';
import { useResourceSpecifications } from '@/hooks/queries/useResourceSpecificationQueries';
import { useServiceSpecifications } from '@/hooks/queries/useServiceSpecificationQueries';
import { useIsOwnOffering } from '@/hooks/useIsOwnOffering';
import { computeOverallDataQualityScore, type DataQualityScores } from '@/lib/utils/dataQuality';
import { extractSpecMetadata } from '@/lib/utils/offeringMetadata';
import {
  CLOSED_PROVIDER_MESSAGE,
  getClosedOrganizationIds,
  isProviderClosed,
} from '@/lib/utils/organizationStatus';
import { extractDatasetMetadata } from '@/lib/utils/productSpecMetadata';
import type { ProductOffering, ProductSpecification } from '@/types/api';

interface OfferingDetailClientProps {
  offeringId: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OfferingDetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function OfferingHeader({
  offering,
  qualityScore,
  ratingAverage,
  ratingCount,
}: Readonly<{
  offering: ProductOffering;
  qualityScore: number | null;
  ratingAverage: number;
  ratingCount: number;
}>) {
  return (
    <Card variant="outlined" radius="xl">
      <div className="mb-3 flex flex-wrap gap-2">
        {(offering.category?.length ?? 0) > 0 ? (
          offering.category!.map((cat) => (
            <Badge key={cat.id ?? cat.name} variant="alt">
              {cat.name ?? cat.id}
            </Badge>
          ))
        ) : (
          <Badge variant="alt">Sin categoría</Badge>
        )}
        {offering.lifecycleStatus && <Badge variant="outline">{offering.lifecycleStatus}</Badge>}
        {qualityScore !== null && <DataQualityBadge score={qualityScore} />}
      </div>
      <Typography as="h1" variant="title" color="primary" className="mb-2">
        {offering.name ?? 'Oferta sin nombre'}
      </Typography>
      <div className="mb-3">
        <CommentsSummary average={ratingAverage} count={ratingCount} />
      </div>
      {offering.description && (
        <Typography variant="body" color="gray">
          {offering.description}
        </Typography>
      )}
    </Card>
  );
}

// ─── Technical specification ───────────────────────────────────────────────────

function TechSpecSection({
  spec,
  metadata,
}: Readonly<{
  spec: ProductSpecification | undefined;
  metadata: ReturnType<typeof extractSpecMetadata>;
}>) {
  const { data: resourceSpecs = [] } = useResourceSpecifications();
  const { data: serviceSpecs = [] } = useServiceSpecifications();

  const resourceById = new Map(resourceSpecs.map((r) => [r.id, r]));
  const serviceById = new Map(serviceSpecs.map((s) => [s.id, s]));

  const resourceNames = (spec?.resourceSpecification ?? [])
    .map((r) => r.name ?? resourceById.get(r.id)?.name ?? r.id)
    .filter(Boolean);
  const serviceNames = (spec?.serviceSpecification ?? [])
    .map((s) => s.name ?? serviceById.get(s.id)?.name ?? s.id)
    .filter(Boolean);

  const chips = [
    metadata.distributions && { label: 'Formato', value: metadata.distributions },
    metadata.standard && { label: 'Estándar', value: metadata.standard },
    metadata.license && { label: 'Licencia', value: metadata.license },
    metadata.productNumber && { label: 'Referencia', value: metadata.productNumber },
  ].filter((c): c is { label: string; value: string } => Boolean(c));

  if (chips.length === 0 && resourceNames.length === 0 && serviceNames.length === 0) return null;

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
      {(resourceNames.length > 0 || serviceNames.length > 0) && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {resourceNames.map((name) => (
            <Badge key={`resource-${name}`} variant="alt">
              {name}
            </Badge>
          ))}
          {serviceNames.map((name) => (
            <Badge key={`service-${name}`} variant="alt">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Data quality ─────────────────────────────────────────────────────────

function DataQualitySection({
  scores,
  overallScore,
}: Readonly<{ scores: DataQualityScores; overallScore: number }>) {
  return (
    <Card variant="outlined" radius="xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Typography as="h2" variant="title" color="primary">
          Calidad del dato
        </Typography>
        <DataQualityBadge score={overallScore} />
      </div>
      <DataQualityRadarChart scores={scores} />
    </Card>
  );
}

// ─── Commercial terms ──────────────────────────────────────────────────

function CommercialTermsSection({ offering }: Readonly<{ offering: ProductOffering }>) {
  const { data: allPrices = [] } = useProductOfferingPrices();
  const priceIds = new Set((offering.productOfferingPrice ?? []).map((p) => p.id));
  const linkedPrices = allPrices.filter((p) => p.id && priceIds.has(p.id));
  const terms = offering.productOfferingTerm ?? [];
  const places = (offering.place ?? []).map((p) => p.name ?? p.id).filter(Boolean);

  if (linkedPrices.length === 0 && terms.length === 0 && places.length === 0) return null;

  return (
    <Card variant="outlined" radius="xl">
      <Typography as="h2" variant="title" color="primary" className="mb-4">
        Condiciones comerciales
      </Typography>
      <div className="flex flex-col gap-4">
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
                {PRICE_TYPE_LABELS[price.priceType ?? ''] ?? price.priceType}
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
            <Icon name="MapPin" size={14} />
            {places.join(', ')}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Access policy ───────────────────────────────────────────────────────

function AccessPolicySection({
  specId,
  specLoading,
}: Readonly<{ specId: string | undefined; specLoading: boolean }>) {
  return (
    <Card variant="outlined" radius="xl">
      <Typography as="h2" variant="title" color="primary" className="mb-4 flex items-center gap-2">
        <Icon name="ShieldCheck" size={18} />
        Política de acceso
      </Typography>
      <OfferingPolicyContent specId={specId} specLoading={specLoading} />
    </Card>
  );
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────

function OfferingDetail({ offeringId }: Readonly<{ offeringId: string }>) {
  const { data: offering, isLoading, isError } = useProductOffering(offeringId);
  const specId = offering?.productSpecification?.id ?? '';
  const { data: spec, isLoading: specLoading } = useProductSpecification(specId);
  const { data: commentsData } = useOfferingComments(offeringId);
  const { isOwnOffering } = useIsOwnOffering();
  const { data: orgs, isLoading: orgsLoading } = useOrganizations();

  if (isLoading || (specId && specLoading) || orgsLoading) return <OfferingDetailSkeleton />;

  if (isError || !offering) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon name="Package" size={32} className="text-gray-200" />
        <Typography variant="small" color="gray">
          No se encontró esta oferta de producto.
        </Typography>
        <Link href="/catalogo" variant="primary">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  if (isProviderClosed(spec, getClosedOrganizationIds(orgs ?? []))) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon name="Package" size={32} className="text-gray-200" />
        <Typography variant="small" color="gray">
          {CLOSED_PROVIDER_MESSAGE}
        </Typography>
        <Link href="/catalogo" variant="primary">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const publisher =
    spec?.brand ??
    spec?.relatedParty?.find((p) => p.role === 'provider')?.name ??
    offering.relatedParty?.find((p) => p.role === 'provider')?.name;
  const metadata = extractSpecMetadata(spec);
  const scores = specId ? extractDatasetMetadata(spec) : {};
  const qualityScore = computeOverallDataQualityScore(scores);

  return (
    <>
      <Breadcrumb
        items={[{ label: 'Catálogo', href: '/catalogo' }, { label: offering.name ?? 'Oferta' }]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="flex flex-col gap-6">
          <OfferingHeader
            offering={offering}
            qualityScore={qualityScore}
            ratingAverage={commentsData?.average ?? 0}
            ratingCount={commentsData?.count ?? 0}
          />
          <TechSpecSection spec={spec} metadata={metadata} />
          {qualityScore !== null && (
            <DataQualitySection scores={scores} overallScore={qualityScore} />
          )}
          <CommercialTermsSection offering={offering} />
          <AccessPolicySection specId={specId || undefined} specLoading={specLoading} />
          <Card variant="outlined" radius="xl">
            <OfferingComments offeringId={offeringId} />
          </Card>
        </div>

        <OfferingBuyBox
          offering={offering}
          publisher={publisher}
          isOwnOffering={isOwnOffering(offering)}
        />
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
