'use client';

import type React from 'react';
import { useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Card from '@/components/atoms/Card';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import type { MetadataItemProps } from '@/components/molecules/MetadataItem';
import MetadataList from '@/components/molecules/MetadataList';
import OfferingPolicyContent from '@/components/molecules/OfferingPolicyContent';
import { formatDate } from '@/lib/utils/formatDate';
import type { ProductOffering } from '@/types/api';

interface OfferingCardProps {
  offering: ProductOffering;
  /** Action area rendered at the bottom right, after the access policy toggle (buttons...). */
  actions?: React.ReactNode;
  /** Actions rendered before the access policy toggle (e.g. detail link). */
  leadingActions?: React.ReactNode;
  /** Extra badges rendered after the category badges (e.g. own offering). */
  badges?: React.ReactNode;
  /** Content of the expandable access policy panel. Defaults to `OfferingPolicyContent`. */
  policy?: React.ReactNode;
  /** Overrides the metadata shown in the card. */
  metadataItems?: MetadataItemProps[];
}

function buildMetadata(offering: ProductOffering): MetadataItemProps[] {
  const items: MetadataItemProps[] = [
    { icon: 'Circle', label: 'Estado', value: offering.lifecycleStatus ?? '' },
    { icon: 'CalendarDays', label: 'Actualizado', value: formatDate(offering.lastUpdate) },
    { icon: 'Tag', label: 'Versión', value: offering.version ?? '' },
    {
      icon: 'FileText',
      label: 'Especificación',
      value: offering.productSpecification?.name ?? '',
    },
  ];
  // Here you define your business logic (extra metadata: price, publisher, terms...).
  return items.filter((item) => item.value && item.value !== '-');
}

/**
 * OfferingCard - Summary card of a `ProductOffering` for catalog listings, with an expandable
 * access policy panel.
 */
export default function OfferingCard({
  offering,
  actions,
  leadingActions,
  badges,
  policy,
  metadataItems,
}: Readonly<OfferingCardProps>) {
  const [showPolicy, setShowPolicy] = useState(false);
  const categories = offering.category ?? [];
  const metadata = metadataItems ?? buildMetadata(offering);

  return (
    <Card
      variant="interactive"
      radius="xl"
      className="hover:bg-muted/20 overflow-hidden transition-colors"
    >
      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        <div className="bg-muted flex h-12 md:h-24 w-12 md:w-24 shrink-0 items-center justify-center rounded-lg border border-gray-100">
          <Icon name="Package" className="text-gray-400 size-6 md:size-10" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <Badge key={cat.id ?? cat.name} variant="alt">
                  {cat.name ?? cat.id}
                </Badge>
              ))
            ) : (
              <Badge variant="alt">Sin categoría</Badge>
            )}
            {badges}
          </div>

          <Typography as="h3" variant="title" color="primary" className="mb-2 line-clamp-2">
            {offering.name ?? 'Oferta sin nombre'}
          </Typography>

          {offering.description && (
            <Typography variant="body" color="gray" className="mb-6 line-clamp-2">
              {offering.description}
            </Typography>
          )}

          {metadata.length > 0 && (
            <div className="border-b border-muted mb-6 pb-6">
              <MetadataList metadataItems={metadata} />
            </div>
          )}

          {showPolicy && (
            <div className="mb-6 rounded-xl border border-gray-100 bg-muted/40 p-4 space-y-3">
              <Typography
                variant="small"
                className="font-semibold text-gray-700 flex items-center gap-1.5"
              >
                <Icon name="ShieldCheck" size={14} />
                Política de acceso
              </Typography>
              {policy ?? (
                // Here you define how the access policy is resolved (specification query, expiry...).
                <OfferingPolicyContent
                  specId={offering.productSpecification?.id}
                  specLoading={false}
                  accessExpiresAt=""
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            {leadingActions}
            <Button size="sm" variant="outline" onClick={() => setShowPolicy((v) => !v)}>
              {showPolicy ? 'Ocultar política' : 'Ver política de acceso'}
            </Button>
            {actions}
          </div>
        </div>
      </div>
    </Card>
  );
}
