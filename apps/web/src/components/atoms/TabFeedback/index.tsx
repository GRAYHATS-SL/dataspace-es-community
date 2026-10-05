import Typography from '@/components/atoms/Typography';

/**
 * TabFeedback - Loading or error message for a tab panel.
 * Returns `null` when there is nothing to show.
 */
export default function TabFeedback({
  loading,
  error,
}: Readonly<{ loading: boolean; error: boolean }>) {
  if (loading)
    return (
      <Typography variant="small" color="gray" className="py-8 text-center">
        Cargando…
      </Typography>
    );
  if (error)
    return (
      <Typography variant="small" color="gray" className="py-8 text-center text-danger">
        Error al cargar los datos. Inténtalo de nuevo.
      </Typography>
    );
  return null;
}
