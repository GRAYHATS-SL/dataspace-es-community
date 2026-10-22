/**
 * Formats an ISO date string into a human-readable Spanish locale date.
 *
 * @param date - ISO 8601 date string
 * @returns Formatted date, or `'-'` if absent or invalid.
 */
export function formatDate(date?: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}
