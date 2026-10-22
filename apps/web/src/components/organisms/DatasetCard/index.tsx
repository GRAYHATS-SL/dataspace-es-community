import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import MetadataList from '@/components/molecules/MetadataList';
import type { CatalogDataset } from '@/types/data';

/**
 * DatasetCard - Dataset summary card
 *
 * @example
 * // Navigation with Links (preferred)
 * <DatasetCard
 *   dataset={catalogDataset}
 *   viewDetailsHref={`/datasets/${id}`}
 *   requestAccessHref={`/datasets/${id}/solicitar`}
 * />
 *
 * // Navigation with callbacks (for complex cases)
 * <DatasetCard
 *   dataset={catalogDataset}
 *   onViewDetails={(id) => navigate(`/datasets/${id}`)}
 *   onRequestAccess={(id) => openAccessModal(id)}
 * />
 */
interface DatasetCardProps {
  dataset: CatalogDataset;
  viewDetailsHref?: string;
  requestAccessHref?: string;
  onViewDetails?: (id: string) => void;
  onRequestAccess?: (id: string) => void;
}

export default function DatasetCard({
  dataset,
  viewDetailsHref,
  requestAccessHref,
  onViewDetails,
  onRequestAccess,
}: Readonly<DatasetCardProps>) {
  const metadataItems = [
    { icon: 'Building', label: 'Publisher', value: dataset.publisher },
    { icon: 'Scale', label: 'Licencia', value: dataset.license },
    { icon: 'CalendarDays', label: 'Modificado', value: dataset.modified },
    { icon: 'Calendar', label: 'Publicado', value: dataset.published },
    { icon: 'Database', label: 'Distrib.', value: dataset.distribution },
    { icon: 'CheckCircle', label: 'Calidad', value: dataset.quality },
    { icon: 'FileText', label: 'Estándar', value: dataset.standard },
  ];

  return (
    <Card
      variant="interactive"
      radius="xl"
      className="hover:bg-muted/20 overflow-hidden transition-colors"
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Dataset Icon */}
        <div className="bg-muted flex h-12 md:h-24 w-12 md:w-24 shrink-0 items-center justify-center rounded-lg border border-gray-100">
          <Icon name={dataset.icon || 'Database'} className="text-gray-400 size-6 md:size-10" />
        </div>

        {/* Dataset Content */}
        <div className="flex-1">
          {/* Categories */}
          <div className="mb-3 flex flex-wrap gap-2">
            {Array.isArray(dataset.categories) && dataset.categories.length > 0 ? (
              dataset.categories.map((category) => (
                <Badge key={category} variant="alt">
                  {category}
                </Badge>
              ))
            ) : (
              <Badge variant="alt">Sin categoría</Badge>
            )}
          </div>

          {/* Title */}
          <Typography as="h3" variant="title" color="primary" className="mb-2 line-clamp-2">
            {dataset.title}
          </Typography>

          {/* Description */}
          <Typography variant="body" color="gray" className="mb-6 line-clamp-2">
            {dataset.description}
          </Typography>

          {/* Metadata Grid */}
          <div className="border-muted mb-6 border-b pb-6">
            <MetadataList metadataItems={metadataItems} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            {viewDetailsHref ? (
              <Link href={viewDetailsHref}>
                <Button variant="outline">Ver detalles</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={() => onViewDetails?.(dataset.id)}>
                Ver detalles
              </Button>
            )}

            {requestAccessHref ? (
              <Link href={requestAccessHref}>
                <Button variant="primary">Solicitar acceso</Button>
              </Link>
            ) : (
              <Button variant="primary" onClick={() => onRequestAccess?.(dataset.id)}>
                Solicitar acceso
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
