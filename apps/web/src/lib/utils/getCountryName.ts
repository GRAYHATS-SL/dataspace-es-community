/**
 * Resolves an ISO 3166-1 alpha-2 country code to its Spanish display name.
 *
 * @param code - Two-letter country code.
 * @returns The country name, or `code` as fallback.
 */
export const getCountryName = (code: string): string => {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
};
