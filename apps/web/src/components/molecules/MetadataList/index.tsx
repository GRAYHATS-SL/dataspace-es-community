import MetadataItem, { type MetadataItemProps } from '@/components/molecules/MetadataItem';

/** Props of `MetadataList`. */
export interface MetadataListProps {
  metadataItems: MetadataItemProps[];
}

/** MetadataList - Responsive grid of `MetadataItem`. */
const MetadataList = ({ metadataItems }: Readonly<MetadataListProps>) => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
    {metadataItems.map((item) => (
      <MetadataItem key={item.label} {...item} />
    ))}
  </div>
);

export default MetadataList;
