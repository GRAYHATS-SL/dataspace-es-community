'use client';

import type { UseQueryResult } from '@tanstack/react-query';

import {
  useAgreementsAsBuyer,
  useCatalogs,
  useCategories,
  useOrganizations,
  useProductInventory,
  useProductOfferingPrices,
  useProductOfferings,
  useProductOrdersAsBuyer,
  useProductSpecifications,
  useResourceSpecifications,
  useServiceSpecifications,
} from '@/hooks/queries';
import { useIndividuals } from '@/hooks/queries/useIndividualQueries';

interface EndpointCheck {
  readonly entity: string;
  readonly basePath: string;
  readonly status: 'loading' | 'success' | 'error';
  readonly detail: string;
}

function toCheck(
  entity: string,
  basePath: string,
  query: UseQueryResult<unknown, Error>,
): EndpointCheck {
  if (query.isLoading) {
    return { entity, basePath, status: 'loading', detail: '' };
  }
  if (query.isError) {
    return { entity, basePath, status: 'error', detail: query.error.message };
  }
  const count = Array.isArray(query.data) ? query.data.length : 1;
  return { entity, basePath, status: 'success', detail: `${count} elemento(s)` };
}

const STATUS_ICON: Record<EndpointCheck['status'], string> = {
  loading: '⏳',
  success: '✅',
  error: '❌',
};

export default function DebugEndpointsPageClient() {
  const catalogs = useCatalogs();
  const categories = useCategories();
  const offerings = useProductOfferings();
  const prices = useProductOfferingPrices();
  const productSpecs = useProductSpecifications();
  const serviceSpecs = useServiceSpecifications();
  const resourceSpecs = useResourceSpecifications();
  const organizations = useOrganizations();
  const individuals = useIndividuals();
  const productOrders = useProductOrdersAsBuyer();
  const productInventory = useProductInventory();
  const agreements = useAgreementsAsBuyer();

  const checks: EndpointCheck[] = [
    toCheck('Catalog', '/tmf-api/productCatalogManagement/v4/catalog', catalogs),
    toCheck('Category', '/tmf-api/productCatalogManagement/v4/category', categories),
    toCheck('ProductOffering', '/tmf-api/productCatalogManagement/v4/productOffering', offerings),
    toCheck(
      'ProductOfferingPrice',
      '/tmf-api/productCatalogManagement/v4/productOfferingPrice',
      prices,
    ),
    toCheck(
      'ProductSpecification',
      '/tmf-api/productCatalogManagement/v4/productSpecification',
      productSpecs,
    ),
    toCheck(
      'ServiceSpecification',
      '/tmf-api/serviceCatalogManagement/v4/serviceSpecification',
      serviceSpecs,
    ),
    toCheck(
      'ResourceSpecification',
      '/tmf-api/resourceCatalog/v4/resourceSpecification',
      resourceSpecs,
    ),
    toCheck('Organization', '/tmf-api/party/v4/organization', organizations),
    toCheck('Individual', '/tmf-api/party/v4/individual', individuals),
    toCheck('ProductOrder', '/tmf-api/productOrderingManagement/v4/productOrder', productOrders),
    toCheck('ProductInventory', '/tmf-api/productInventory/v4/product', productInventory),
    toCheck('Agreement', '/tmf-api/agreementManagement/v4/agreement', agreements),
  ];

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-semibold">Debug: permisos APISIX por entidad</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Página temporal — solo disponible fuera de producción. Bórrala una vez habilitados los
        endpoints.
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">Entidad</th>
            <th className="p-2">Base path</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.entity} className="border-b">
              <td className="p-2 font-medium">{check.entity}</td>
              <td className="p-2 font-mono text-xs">{check.basePath}</td>
              <td className="p-2">{STATUS_ICON[check.status]}</td>
              <td className="p-2 break-all">{check.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
