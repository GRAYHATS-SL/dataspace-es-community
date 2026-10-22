import Typography from '@/components/atoms/Typography';

/**
 * EmptyState - Empty-list message
 *
 * @param {string} label - Plural name of the empty entity.
 */
export default function EmptyState({ label }: Readonly<{ label: string }>) {
  return (
    <Typography variant="small" color="gray" className="py-8 text-center">
      No hay {label} disponibles.
    </Typography>
  );
}
