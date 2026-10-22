import Container from '@/components/atoms/Container';
import Link from '@/components/atoms/Link';

// Internal-use page — testing with the TMForum APIs. Not linked from any navigation component. Accessible at /dashboard/productManagement for development/QA use.
const ProductManagementPage = () => {
  return (
    <Container className="py-10">
      <span className="text-xs font-thin mb-3">Testing connection with TMForum APIs</span>
      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-2">Gestión de Catálogo (CRUD TMForum)</h3>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>
            <Link
              href="/dashboard/productManagement/catalog"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Catálogos
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/party"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Party
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/category"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Categorías
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/product-offering"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Product Offering
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/product-specification"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Product Specification
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/product-offering-price"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Product Offering Price
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/resource-specification"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Resource Specification
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/service-specification"
              className="text-blue-700 underline hover:text-blue-900"
            >
              Service Specification
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/productManagement/catalog-category-test"
              className="text-amber-700 underline hover:text-amber-900 font-medium"
            >
              [TEST] Integridad referencial Catálogo ↔ Categoría
            </Link>
          </li>
        </ul>
      </div>
    </Container>
  );
};

export default ProductManagementPage;
