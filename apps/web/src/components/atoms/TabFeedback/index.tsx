import Typography from '@/components/atoms/Typography';

/**
 * TabFeedback - Loading or error message for tab content
 *
 * @param {boolean} loading - Shows the loading message.
 * @param {boolean} error - Shows the error message when not loading.
 * @returns {React.ReactElement|null} The message, or `null` if neither applies.
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
