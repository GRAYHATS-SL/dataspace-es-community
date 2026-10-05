/** Resolves an ISO 3166-1 alpha-2 code to its Spanish name, falling back to the code itself. */
export const getCountryName = (code: string): string => {
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
};
