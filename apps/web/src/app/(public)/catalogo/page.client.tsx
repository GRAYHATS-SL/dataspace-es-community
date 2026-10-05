'use client';

import { useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Input from '@/components/atoms/Input';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import Pagination from '@/components/molecules/Pagination';
import SectionHeader from '@/components/molecules/SectionHeader';
import CheckoutDrawer from '@/components/organisms/CheckoutDrawer';
import OfferingCard from '@/components/organisms/OfferingCard';
import OfferingFilterPanel from '@/components/organisms/OfferingFilterPanel';
import { useCatalogPublicPage } from '@/hooks/useCatalogPublicPage';
import type { ProductOffering } from '@/types/api';

function FilteringIndicator({
  activeFilterCount,
  searchTerm,
}: Readonly<{ activeFilterCount: number; searchTerm: string }>) {
  const plural = activeFilterCount === 1 ? '' : 's';
  return (
    <Typography variant="small" color="gray">
      {searchTerm
        ? `Mostrando resultados para "${searchTerm}"`
        : `${activeFilterCount} filtro${plural} activo${plural}`}
    </Typography>
  );
}

/** Detail link shown before the access policy toggle. */
function OfferingLeadingActions({
  offering,
  isAuthenticated,
}: Readonly<{ offering: ProductOffering; isAuthenticated: boolean }>) {
  if (!offering.id) return null;
  if (!isAuthenticated) {
    return (
      <Link href="/inicio-sesion" variant="primary">
        Inicia sesión para ver el detalle
      </Link>
    );
  }
  return (
    <Link href={`/catalogo/${encodeURIComponent(offering.id)}`} variant="primary">
      Ver ficha y comentarios
    </Link>
  );
}

function StateMessage({ icon, message, detail }: Readonly<{ icon: string; message: string; detail?: string }>) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <Icon name={icon} size={40} className="text-gray-200" aria-hidden="true" />
      <Typography variant="small" color="gray">
        {message}
      </Typography>
      {detail && <Typography variant="form-hint">{detail}</Typography>}
    </div>
  );
}

function CatalogResults({
  onAcquire,
  page,
}: Readonly<{
  onAcquire: (offering: ProductOffering) => void;
  page: ReturnType<typeof useCatalogPublicPage>;
}>) {
  if (page.isLoading) {
    return (
      <div className="flex items-center justify-center py-24" role="status">
        <Typography variant="small" color="gray">
          Cargando…
        </Typography>
      </div>
    );
  }
  if (page.error) {
    return (
      <div role="alert">
        <StateMessage icon="AlertCircle" message="No se pudo cargar el catálogo." detail={page.error.message} />
      </div>
    );
  }
  if (!page.hasResults) {
    return (
      <StateMessage
        icon="Inbox"
        message={
          page.isFiltering
            ? 'No se encontraron ofertas con esos criterios.'
            : 'No hay ofertas de producto disponibles.'
        }
      />
    );
  }

  const plural = page.totalItems === 1 ? '' : 's';
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="mb-3">
        <Typography variant="small" color="gray">
          {page.totalItems} resultado{plural}
          {page.isFiltering ? ' con los filtros aplicados' : ''}
        </Typography>
      </div>
      <div className="flex flex-col gap-4">
        {page.paginatedOfferings.map((offering, index) => (
          <OfferingCard
            key={offering.id ?? `${offering.name ?? 'offering'}-${index}`}
            offering={offering}
            badges={page.isOwnOffering(offering) && <Badge variant="filled">Tu oferta</Badge>}
            leadingActions={
              <OfferingLeadingActions offering={offering} isAuthenticated={page.isAuthenticated} />
            }
            actions={
              offering.id &&
              page.isAuthenticated &&
              !page.isOwnOffering(offering) && (
                <Button variant="primary" onClick={() => onAcquire(offering)}>
                  Adquirir
                </Button>
              )
            }
          />
        ))}
      </div>
      <div className="flex flex-row justify-between items-center pt-2 pb-6">
        <Typography variant="small" color="gray">
          Mostrando {page.rangeStart}–{page.rangeEnd} de {page.totalItems} resultado{plural}
        </Typography>
        <Pagination
          currentPage={page.currentPage}
          totalPages={page.totalPages}
          onPageChange={page.goToPage}
        />
      </div>
    </>
  );
}

export default function CatalogPublicClient() {
  const [checkoutOffering, setCheckoutOffering] = useState<ProductOffering | null>(null);
  const page = useCatalogPublicPage();
  const { filters, setFilters } = page;

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Catálogo de productos"
          subtitle="Explora y descubre las ofertas de producto disponibles en el marketplace."
          additionalContent={
            page.isFiltering ? (
              <FilteringIndicator
                activeFilterCount={page.activeFilterCount}
                searchTerm={filters.searchTerm}
              />
            ) : undefined
          }
          className="px-4"
        />
      </section>

      <section className="py-8">
        <Container>
          <div className="relative mb-6">
            <Icon
              name="Search"
              size={20}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-light"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Buscar ofertas"
              placeholder="Buscar por nombre, descripción, proveedor o características…"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ searchTerm: e.target.value })}
              className="w-full rounded-full pl-12"
              size="lg"
            />
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
            <aside
              aria-label="Filtros de búsqueda"
              className="w-full md:sticky md:top-6 md:w-64 md:shrink-0 md:self-start lg:w-72"
            >
              <OfferingFilterPanel
                filters={filters}
                filterOptions={page.filterOptions}
                activeFilterCount={page.activeFilterCount}
                onFilterChange={setFilters}
                onClearAll={page.clearAllFilters}
              />
            </aside>
            <main className="min-w-0 flex-1">
              <CatalogResults page={page} onAcquire={setCheckoutOffering} />
            </main>
          </div>
        </Container>
      </section>

      <CheckoutDrawer offering={checkoutOffering} onClose={() => setCheckoutOffering(null)} />
    </div>
  );
}
