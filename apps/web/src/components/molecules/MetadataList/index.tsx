import MetadataItem, { MetadataItemProps } from '@/components/molecules/MetadataItem';

interface MetadataListProps {
  metadataItems: MetadataItemProps[];
}

/**
 * MetadataList - Responsive grid of `MetadataItem`
 *
 * @param {MetadataItemProps[]} metadataItems - Metadata items to render.
 */
const MetadataList = ({ metadataItems }: Readonly<MetadataListProps>) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {metadataItems.map((item) => (
        <MetadataItem key={item.label} {...item} />
      ))}
    </div>
  );
};

export default MetadataList;
