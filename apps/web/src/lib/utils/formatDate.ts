/** Formats an ISO date as a short Spanish date, or `'-'` when missing or invalid. */
export function formatDate(date?: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}
