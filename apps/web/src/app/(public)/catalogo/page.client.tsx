'use client';

import { useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Input from '@/components/atoms/Input';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import DataQualityBadge from '@/components/molecules/DataQualityBadge';
import MetadataList from '@/components/molecules/MetadataList';
import OfferingPolicyContent from '@/components/molecules/OfferingPolicyContent';
import Pagination from '@/components/molecules/Pagination';
import SectionHeader from '@/components/molecules/SectionHeader';
import CheckoutDrawer from '@/components/organisms/CheckoutDrawer';
import OfferingFilterPanel from '@/components/organisms/OfferingFilterPanel';
import {
  useProductOfferingPrices,
  useProductOfferingPricesPublicQuery,
} from '@/hooks/queries/useProductOfferingPriceQueries';
import {
  useProductSpecification,
  useProductSpecificationPublicQuery,
} from '@/hooks/queries/useProductSpecificationQueries';
import { useCatalogPublicPage } from '@/hooks/useCatalogPublicPage';
import { useTokenOfferingQuote } from '@/hooks/useTokenOfferingQuote';
import { computeOverallDataQualityScore } from '@/lib/utils/dataQuality';
import {
  buildMetadataItems,
  buildPriceValue,
  extractSpecMetadata,
  formatDate,
} from '@/lib/utils/offeringMetadata';
import type { ProductOffering } from '@/types/api';

const CatalogPublicClient = () => {
  const [checkoutOffering, setCheckoutOffering] = useState<ProductOffering | null>(null);

  const {
    filters,
    filterOptions,
    activeFilterCount,
    isOwnOffering,
    isAuthenticated,
    isLoading,
    isError,
    refetch,
    isFiltering,
    hasResults,
    paginatedOfferings,
    totalItems,
    safePage,
    totalPages,
    rangeStart,
    rangeEnd,
    setFilters,
    clearAllFilters,
    goToPage,
  } = useCatalogPublicPage();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Catálogo de productos"
          subtitle="Explora y descubre las ofertas de producto disponibles en el marketplace."
          additionalContent={
            isFiltering ? (
              <FilteringIndicator
                activeFilterCount={activeFilterCount}
                searchTerm={filters.searchTerm}
              />
            ) : undefined
          }
          className="px-4"
        />
      </section>

      <section className="py-8">
        <Container>
          {/* Búsqueda — ancho completo */}
          <div className="relative mb-6">
            <Icon
              name="Search"
              size={20}
              className="text-gray-light absolute top-1/2 left-4 -translate-y-1/2"
            />
            <Input
              type="text"
              placeholder="Buscar por nombre, descripción, marca o características…"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ searchTerm: e.target.value })}
              className="w-full pl-12 rounded-full"
              size="lg"
            />
          </div>

          {/* Dos columnas: sidebar + resultados */}
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
            {/* Sidebar de filtros */}
            <aside
              aria-label="Filtros de búsqueda"
              className="w-full md:w-64 lg:w-72 md:shrink-0 md:sticky md:top-6 md:self-start"
            >
              <OfferingFilterPanel
                filters={filters}
                filterOptions={filterOptions}
                activeFilterCount={activeFilterCount}
                onFilterChange={setFilters}
                onClearAll={clearAllFilters}
              />
            </aside>

            {/* Listado de ofertas */}
            <main className="min-w-0 flex-1">
              <CatalogContent
                isLoading={isLoading}
                isError={isError}
                onRetry={refetch}
                hasResults={hasResults}
                isFiltering={isFiltering}
                paginatedOfferings={paginatedOfferings}
                isOwnOffering={isOwnOffering}
                isAuthenticated={isAuthenticated}
                onAcquire={setCheckoutOffering}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                totalItems={totalItems}
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </main>
          </div>
        </Container>
      </section>

      <CheckoutDrawer offering={checkoutOffering} onClose={() => setCheckoutOffering(null)} />
    </div>
  );
};

export default CatalogPublicClient;

// ---- Page molecules ----

const CatalogContent = ({
  isLoading,
  isError,
  onRetry,
  hasResults,
  isFiltering,
  paginatedOfferings,
  isOwnOffering,
  isAuthenticated,
  onAcquire,
  rangeStart,
  rangeEnd,
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasResults: boolean;
  isFiltering: boolean;
  paginatedOfferings: ProductOffering[];
  isOwnOffering: (o: ProductOffering) => boolean;
  isAuthenticated: boolean;
  onAcquire: (o: ProductOffering) => void;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}>) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Typography variant="small" color="gray">
          Cargando…
        </Typography>
      </div>
    );
  }
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-24 text-center">
        <Icon name="Inbox" size={40} className="text-gray-200" />
        <Typography variant="small" color="gray">
          No se pudo cargar el catálogo. Inténtalo de nuevo en unos instantes.
        </Typography>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!hasResults) {
    return (
      <EmptyState
        message={
          isFiltering
            ? 'No se encontraron ofertas con esos criterios.'
            : 'No hay ofertas de producto disponibles.'
        }
      />
    );
  }
  return (
    <>
      {/* Conteo de resultados */}
      <div role="status" aria-live="polite" aria-atomic="true" className="mb-3">
        <Typography variant="small" color="gray">
          {totalItems} resultado{totalItems === 1 ? '' : 's'}
          {isFiltering ? ' con los filtros aplicados' : ''}
        </Typography>
      </div>

      <div className="flex flex-col gap-4">
        {paginatedOfferings.map((offering) => (
          <OfferingCard
            key={offering.id ?? offering.href}
            offering={offering}
            isOwnOffering={isOwnOffering(offering)}
            isAuthenticated={isAuthenticated}
            onAcquire={onAcquire}
          />
        ))}
      </div>
      <PaginationFooter
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
};

const FilteringIndicator = ({
  activeFilterCount,
  searchTerm,
}: Readonly<{ activeFilterCount: number; searchTerm: string }>) => {
  const plural = activeFilterCount === 1 ? '' : 's';
  const label = searchTerm
    ? `Mostrando resultados para "${searchTerm}"`
    : `${activeFilterCount} filtro${plural} activo${plural}`;
  return (
    <Typography variant="small" color="gray">
      {label}
    </Typography>
  );
};

const PaginationFooter = ({
  rangeStart,
  rangeEnd,
  totalItems,
  currentPage,
  totalPages,
  onPageChange,
}: Readonly<{
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}>) => (
  <div className="flex flex-row justify-between items-center pt-2 pb-6">
    <Typography variant="small" color="gray">
      Mostrando {rangeStart}–{rangeEnd} de {totalItems} resultado
      {totalItems === 1 ? '' : 's'}
    </Typography>
    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
  </div>
);

// ---- OfferingCard ----

const OfferingCard = ({
  offering,
  isOwnOffering,
  isAuthenticated,
  onAcquire,
}: Readonly<{
  offering: ProductOffering;
  isOwnOffering: boolean;
  isAuthenticated: boolean;
  onAcquire: (offering: ProductOffering) => void;
}>) => {
  const [showPolicy, setShowPolicy] = useState(false);

  const specId = offering.productSpecification?.id ?? '';
  const specPublicQuery = useProductSpecificationPublicQuery(specId, { enabled: !isAuthenticated });
  const specAuthQuery = useProductSpecification(specId, { enabled: isAuthenticated });
  const { data: spec, isLoading: specLoading } = isAuthenticated ? specAuthQuery : specPublicQuery;

  const pricesPublicQuery = useProductOfferingPricesPublicQuery({ enabled: !isAuthenticated });
  const pricesAuthQuery = useProductOfferingPrices({ enabled: isAuthenticated });
  const { data: allPrices = [] } = isAuthenticated ? pricesAuthQuery : pricesPublicQuery;

  const publisher =
    spec?.brand ??
    spec?.relatedParty?.find((p) => p.role === 'provider')?.name ??
    offering.relatedParty?.find((p) => p.role === 'provider')?.name;
  const {
    distributions,
    standard,
    license,
    accuracy,
    completeness,
    consistency,
    credibility,
    timeliness,
    productNumber,
  } = extractSpecMetadata(spec);
  const overallQualityScore = computeOverallDataQualityScore({
    accuracy,
    completeness,
    consistency,
    credibility,
    timeliness,
  });

  const updatedDate = offering.lastUpdate
    ? formatDate(offering.lastUpdate, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  // The public card is the only surface that still computed the static price by hand; the rest (OfferingBuyBox/CheckoutDrawer) already uses `useTokenOfferingQuote`. Disabled for anonymous visitors because the hook uses authenticated queries (spec/prices/inventory).
  const tokenOffering = useTokenOfferingQuote(offering, { enabled: isAuthenticated });

  const priceIds = new Set((offering.productOfferingPrice ?? []).map((p) => p.id));
  const offeringPrices = allPrices.filter((p) => p.id && priceIds.has(p.id));
  const priceValue = tokenOffering.isTokenized
    ? (tokenOffering.price?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ??
      'A consultar')
    : buildPriceValue(offeringPrices);

  const place = (offering.place ?? [])
    .map((p) => p.name ?? p.id)
    .filter(Boolean)
    .join(', ');
  const terms = (offering.productOfferingTerm ?? [])
    .map((t) => t.name)
    .filter(Boolean)
    .join(' · ');

  const metadataItems = buildMetadataItems({
    publisher,
    lifecycleStatus: offering.lifecycleStatus,
    updatedDate,
    priceValue,
    license,
    distributions,
    standard,
    productNumber,
    place,
    terms,
  });

  return (
    <Card
      variant="interactive"
      radius="xl"
      className="hover:bg-muted/20 overflow-hidden transition-colors"
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Icono */}
        <div className="bg-muted flex h-12 md:h-24 w-12 md:w-24 shrink-0 items-center justify-center rounded-lg border border-gray-100">
          <Icon name="Package" className="text-gray-400 size-6 md:size-10" />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Badges de categoría */}
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
            {isOwnOffering && <Badge variant="filled">Tu oferta</Badge>}
            {overallQualityScore !== null && <DataQualityBadge score={overallQualityScore} />}
          </div>

          {/* Título */}
          <Typography as="h3" variant="title" color="primary" className="mb-2 line-clamp-2">
            {offering.name}
          </Typography>

          {/* Descripción */}
          {offering.description && (
            <Typography variant="body" color="gray" className="mb-6 line-clamp-2">
              {offering.description}
            </Typography>
          )}

          {/* Metadata */}
          {metadataItems.length > 0 && (
            <div className="border-b border-muted mb-6 pb-6">
              <MetadataList metadataItems={metadataItems} />
            </div>
          )}

          {/* Política de acceso (expandible) */}
          {showPolicy && (
            <div className="mb-6 rounded-xl border border-gray-100 bg-muted/40 p-4 space-y-3">
              <Typography
                variant="small"
                className="font-semibold text-gray-700 flex items-center gap-1.5"
              >
                <Icon name="ShieldCheck" size={14} />
                Política de acceso
              </Typography>
              <OfferingPolicyContent
                specId={offering.productSpecification?.id}
                specLoading={specLoading}
              />
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-end gap-3">
            {isAuthenticated && (
              <Link href={`/catalogo/${encodeURIComponent(offering.id ?? '')}`} variant="primary">
                Ver ficha y comentarios
              </Link>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowPolicy((v) => !v)}>
              {showPolicy ? 'Ocultar política' : 'Ver política de acceso'}
            </Button>
            {isAuthenticated && !isOwnOffering && (
              <Button variant="primary" onClick={() => onAcquire(offering)}>
                Adquirir
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

const EmptyState = ({ message }: Readonly<{ message: string }>) => (
  <div className="flex flex-col items-center gap-3 py-24 text-center">
    <Icon name="Inbox" size={40} className="text-gray-200" />
    <Typography variant="small" color="gray">
      {message}
    </Typography>
  </div>
);
