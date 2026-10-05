'use client';

import { useRouter } from 'next/navigation';

import CatalogForm from '@/components/organisms/CatalogForm';
import CategoryForm from '@/components/organisms/CategoryForm';
import OfferingForm from '@/components/organisms/OfferingForm';
import ProductSpecForm from '@/components/organisms/ProductSpecForm';
import ResourceSpecForm from '@/components/organisms/ResourceSpecForm';
import ServiceSpecForm from '@/components/organisms/ServiceSpecForm';

/** Entity created by a `publicar/crear-*` page. */
export type PublishEntity = 'catalog' | 'category' | 'offering' | 'product' | 'resource' | 'service';

/** Props of `PublishFormShell`. */
export interface PublishFormShellProps {
  entity: PublishEntity;
}

const BACK_HREF = '/dashboard/publicar';

/** Client wrapper that mounts the create form of an entity and returns to the index when done. */
export default function PublishFormShell({ entity }: Readonly<PublishFormShellProps>) {
  const router = useRouter();
  const goBack = () => router.push(BACK_HREF);

  switch (entity) {
    case 'catalog':
      return <CatalogForm onClose={goBack} />;
    case 'category':
      return <CategoryForm onClose={goBack} />;
    case 'offering':
      return <OfferingForm onClose={goBack} />;
    case 'product':
      return <ProductSpecForm onClose={goBack} />;
    case 'resource':
      return <ResourceSpecForm onClose={goBack} />;
    case 'service':
      return <ServiceSpecForm onClose={goBack} />;
    default:
      return null;
  }
}
