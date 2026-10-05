'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import ProductStatusBadge from '@/components/atoms/ProductStatusBadge';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import Table from '@/components/organisms/Table';
import { useProductInventory, useUpdateProductStatus } from '@/hooks/queries';
import { formatDate } from '@/lib/utils/formatDate';
import type { ProductInventory, ProductStatus } from '@/types/api';

import { BUYER_COLUMNS, type ProductRole, SELLER_COLUMNS, TABS } from './_sections/constants';
import { filterProductsByRole, getPartyName } from './_sections/helpers';
import ProductDetailDrawer from './_sections/ProductDetailDrawer';
import SellerProductActions from './_sections/SellerProductActions';
import TokenConsumptionCell from './_sections/TokenConsumptionCell';

/** Client view of "my products": inventory as consumer or provider. */
export default function MyProductsClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProductRole>('buyer');
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);

  const inventoryQuery = useProductInventory();
  const updateStatusMutation = useUpdateProductStatus();

  const isBuyer = activeTab === 'buyer';
  const products = filterProductsByRole(inventoryQuery.data ?? [], activeTab);
  const columns = isBuyer ? BUYER_COLUMNS : SELLER_COLUMNS;

  const handleUpdateStatus = (id: string, status: ProductStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const renderBuyerCells = (product: ProductInventory) => {
    const agreementId = product.agreement?.[0]?.id;
    return (
      <>
        <td className="px-4 py-3 text-center">
          <TokenConsumptionCell product={product} />
        </td>
        <td className="px-4 py-3 text-center">
          {agreementId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                router.push(`/dashboard/acuerdos?id=${encodeURIComponent(agreementId)}`)
              }
            >
              Ver acuerdo
            </Button>
          ) : (
            <Typography variant="small" color="gray">
              —
            </Typography>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(product)}>
            Ver detalle
          </Button>
        </td>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mis productos"
          subtitle="Productos y servicios con acceso activo"
          className="px-4"
        />
      </section>

      <Container className="py-10">
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id === 'seller' ? 'seller' : 'buyer')}
          aria-label="Rol"
          className="mb-6"
        />

        <div className="mb-6">
          <Typography as="h2" variant="subtitle" color="primary">
            {isBuyer ? 'Accesos como consumidor' : 'Accesos como proveedor'}
          </Typography>
        </div>

        {inventoryQuery.isError && (
          <Typography variant="small" color="danger" role="alert" className="mb-4">
            No se pudieron cargar los productos: {inventoryQuery.error.message}
          </Typography>
        )}
        {updateStatusMutation.isError && (
          <Typography variant="small" color="danger" role="alert" className="mb-4">
            No se pudo actualizar el estado: {updateStatusMutation.error.message}
          </Typography>
        )}

        <Table
          columns={columns}
          data={products}
          loading={inventoryQuery.isLoading}
          variant="plain"
          size="md"
          keyExtractor={(p, i) => p.id ?? i}
          emptyState={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Icon name="Package" size={40} className="text-gray-200" />
              <Typography variant="body" color="gray">
                {isBuyer
                  ? 'No tienes productos activos como consumidor todavía.'
                  : 'No has activado accesos como proveedor todavía.'}
              </Typography>
            </div>
          }
          renderRow={(product) => (
            <>
              <td className="px-4 py-3 text-left">
                <Typography variant="body" className="font-medium">
                  {product.name ?? '—'}
                </Typography>
              </td>
              <td className="px-4 py-3 text-left">
                <Typography variant="small" color="gray">
                  {getPartyName(product, isBuyer ? 'seller' : 'buyer')}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <Typography variant="small" color="gray">
                  {formatDate(product.startDate)}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <Typography variant="small" color="gray">
                  {product.terminationDate ? formatDate(product.terminationDate) : 'Sin expiración'}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <ProductStatusBadge status={product.status} />
              </td>
              {isBuyer ? (
                renderBuyerCells(product)
              ) : (
                <td className="px-4 py-3 text-right">
                  <SellerProductActions
                    product={product}
                    onUpdate={handleUpdateStatus}
                    isLoading={updateStatusMutation.isPending}
                  />
                </td>
              )}
            </>
          )}
        />
      </Container>

      <ProductDetailDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
