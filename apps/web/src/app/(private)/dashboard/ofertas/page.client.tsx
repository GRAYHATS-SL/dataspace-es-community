'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import type {
  Catalog,
  Category,
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
  ResourceSpecification,
  ServiceSpecification,
} from '@/types/api';

import CatalogForm from './_sections/CatalogForm';
import CatalogList from './_sections/CatalogList';
import CategoryForm from './_sections/CategoryForm';
import CategoryList from './_sections/CategoryList';
import { type TabId, TABS } from './_sections/constants';
import OfertasDrawer from './_sections/OfertasDrawer';
import OfferingForm from './_sections/OfferingForm';
import OfferingList from './_sections/OfferingList';
import PriceForm from './_sections/PriceForm';
import PriceList from './_sections/PriceList';
import ProductSpecForm from './_sections/ProductSpecForm';
import ProductSpecList from './_sections/ProductSpecList';
import ResourceSpecForm from './_sections/ResourceSpecForm';
import ResourceSpecList from './_sections/ResourceSpecList';
import ServiceSpecForm from './_sections/ServiceSpecForm';
import ServiceSpecList from './_sections/ServiceSpecList';
import { useOfertasData } from './_sections/useOfertasData';

interface OfertasPageClientProps {
  activeTab: string;
  /** Only ADMIN can create categories. */
  isAdmin: boolean;
}

const OfertasPageClient = ({ activeTab, isAdmin }: Readonly<OfertasPageClientProps>) => {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const openForm = useCallback(() => {
    setFormKey((k) => k + 1);
    setShowForm(true);
  }, []);
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingOffering, setEditingOffering] = useState<ProductOffering | null>(null);
  const [editingPrice, setEditingPrice] = useState<ProductOfferingPrice | null>(null);
  const [editingProductSpec, setEditingProductSpec] = useState<ProductSpecification | null>(null);
  const [editingResourceSpec, setEditingResourceSpec] = useState<ResourceSpecification | null>(
    null,
  );
  const [editingServiceSpec, setEditingServiceSpec] = useState<ServiceSpecification | null>(null);

  const {
    catalogsQuery,
    categoriesQuery,
    offeringsQuery,
    productSpecsQuery,
    resourceSpecsQuery,
    serviceSpecsQuery,
    pricesQuery,
    catalogs,
    categories,
    offerings,
    productSpecs,
    resourceSpecs,
    serviceSpecs,
    prices,
    categoryCatalogRefs,
    categoryOfferingRefs,
    productSpecOfferingRefs,
    resourceSpecProductSpecRefs,
    serviceSpecProductSpecRefs,
    priceOfferingRefs,
    publisherBySpecId,
    specById,
  } = useOfertasData(activeTab as TabId);

  const handleEditCatalog = useCallback(
    (c: Catalog) => {
      setEditingCatalog(c);
      openForm();
    },
    [openForm],
  );
  const handleEditCategory = useCallback(
    (c: Category) => {
      setEditingCategory(c);
      openForm();
    },
    [openForm],
  );
  const handleEditOffering = useCallback(
    (o: ProductOffering) => {
      setEditingOffering(o);
      openForm();
    },
    [openForm],
  );
  const handleEditPrice = useCallback(
    (p: ProductOfferingPrice) => {
      setEditingPrice(p);
      openForm();
    },
    [openForm],
  );
  const handleEditProductSpec = useCallback(
    (s: ProductSpecification) => {
      setEditingProductSpec(s);
      openForm();
    },
    [openForm],
  );
  const handleEditResourceSpec = useCallback(
    (s: ResourceSpecification) => {
      setEditingResourceSpec(s);
      openForm();
    },
    [openForm],
  );
  const handleEditServiceSpec = useCallback(
    (s: ServiceSpecification) => {
      setEditingServiceSpec(s);
      openForm();
    },
    [openForm],
  );

  const closeForm = () => {
    setShowForm(false);
    setEditingCatalog(null);
    setEditingCategory(null);
    setEditingOffering(null);
    setEditingPrice(null);
    setEditingProductSpec(null);
    setEditingResourceSpec(null);
    setEditingServiceSpec(null);
  };

  const handleTabChange = (tabId: string) => {
    closeForm();
    router.push(`/dashboard/ofertas?tab=${tabId}`, { scroll: false });
  };

  const activeTabConfig = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const canCreate = activeTab !== 'categorias' || isAdmin;

  const EDIT_LABELS: Partial<Record<TabId, string>> = {
    catalogos: 'Editar catálogo',
    categorias: 'Editar categoría',
    ofertas: 'Editar oferta',
    precios: 'Editar precio',
    'especificaciones-producto': 'Editar espec. de producto',
    'especificaciones-recurso': 'Editar espec. de recurso',
    'especificaciones-servicio': 'Editar espec. de servicio',
  };

  const editingItemByTab: Partial<Record<TabId, { name?: string } | null>> = {
    catalogos: editingCatalog,
    categorias: editingCategory,
    ofertas: editingOffering,
    precios: editingPrice,
    'especificaciones-producto': editingProductSpec,
    'especificaciones-recurso': editingResourceSpec,
    'especificaciones-servicio': editingServiceSpec,
  };

  const editingItem = editingItemByTab[activeTab as TabId];
  const drawerTitle = editingItem
    ? (EDIT_LABELS[activeTab as TabId] ?? activeTabConfig.createLabel)
    : activeTabConfig.createLabel;
  const drawerDescription = editingItem ? editingItem.name : activeTabConfig.description;

  const ACTIVE_FORM: Partial<Record<TabId, React.ReactNode>> = {
    catalogos: <CatalogForm key={formKey} onClose={closeForm} editingCatalog={editingCatalog} />,
    categorias: (
      <CategoryForm key={formKey} onClose={closeForm} editingCategory={editingCategory} />
    ),
    ofertas: <OfferingForm key={formKey} onClose={closeForm} editingOffering={editingOffering} />,
    'especificaciones-producto': (
      <ProductSpecForm key={formKey} onClose={closeForm} editingProductSpec={editingProductSpec} />
    ),
    'especificaciones-recurso': (
      <ResourceSpecForm
        key={formKey}
        onClose={closeForm}
        editingResourceSpec={editingResourceSpec}
      />
    ),
    'especificaciones-servicio': (
      <ServiceSpecForm
        key={formKey}
        onClose={closeForm}
        editingServiceSpec={editingServiceSpec}
        serviceSpecs={serviceSpecs}
      />
    ),
    precios: <PriceForm key={formKey} onClose={closeForm} editingPrice={editingPrice} />,
  };

  const TAB_CONTENT: Partial<Record<TabId, React.ReactNode>> = {
    catalogos: (
      <CatalogList
        query={catalogsQuery}
        catalogs={catalogs}
        categories={categories}
        onEdit={handleEditCatalog}
      />
    ),
    categorias: (
      <CategoryList
        query={categoriesQuery}
        categories={categories}
        categoryCatalogRefs={categoryCatalogRefs}
        categoryOfferingRefs={categoryOfferingRefs}
        onEdit={handleEditCategory}
      />
    ),
    ofertas: (
      <OfferingList
        query={offeringsQuery}
        offerings={offerings}
        categories={categories}
        publisherBySpecId={publisherBySpecId}
        specById={specById}
        onEdit={handleEditOffering}
      />
    ),
    'especificaciones-producto': (
      <ProductSpecList
        query={productSpecsQuery}
        productSpecs={productSpecs}
        productSpecOfferingRefs={productSpecOfferingRefs}
        onEdit={handleEditProductSpec}
      />
    ),
    'especificaciones-recurso': (
      <ResourceSpecList
        query={resourceSpecsQuery}
        resourceSpecs={resourceSpecs}
        resourceSpecProductSpecRefs={resourceSpecProductSpecRefs}
        onEdit={handleEditResourceSpec}
      />
    ),
    'especificaciones-servicio': (
      <ServiceSpecList
        query={serviceSpecsQuery}
        serviceSpecs={serviceSpecs}
        serviceSpecProductSpecRefs={serviceSpecProductSpecRefs}
        onEdit={handleEditServiceSpec}
      />
    ),
    precios: (
      <PriceList
        query={pricesQuery}
        prices={prices}
        priceOfferingRefs={priceOfferingRefs}
        onEdit={handleEditPrice}
      />
    ),
  };

  return (
    <div className="min-h-screen bg-white">
      <OfertasDrawer
        open={showForm}
        onClose={closeForm}
        title={drawerTitle}
        description={drawerDescription}
      >
        {/* Solo se monta abierto: así los formularios no lanzan sus consultas al cargar la pestaña. */}
        {showForm ? (ACTIVE_FORM[activeTab as TabId] ?? null) : null}
      </OfertasDrawer>

      <section className="bg-muted py-12">
        <SectionHeader
          title="Mis Ofertas"
          subtitle="Visualiza tus catálogos, ofertas y especificaciones creadas."
          className="px-4"
        />
      </section>

      <Container className="py-10">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          className="mb-8"
        />

        <div className="flex items-start justify-between mb-6">
          <div>
            <Typography
              as="h2"
              variant="subtitle"
              color="primary"
              className="tracking-tight font-semibold"
            >
              {activeTabConfig.label}
            </Typography>
            <Typography variant="small" color="gray" className="mt-0.5">
              {activeTabConfig.description}
            </Typography>
          </div>
          {canCreate && (
            <Button
              variant={showForm ? 'outline' : 'primary'}
              size="md"
              onClick={() => (showForm ? closeForm() : openForm())}
              aria-expanded={showForm}
            >
              {showForm ? (
                <>
                  <Icon name="X" size={14} className="mr-1.5" aria-hidden="true" />
                  Cancelar
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="mr-1.5">
                    +
                  </span>
                  {activeTabConfig.createLabel}
                </>
              )}
            </Button>
          )}
        </div>

        {TAB_CONTENT[activeTab as TabId] ?? null}
      </Container>
    </div>
  );
};

export default OfertasPageClient;
