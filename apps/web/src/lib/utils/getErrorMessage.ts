/** Extracts a readable message from a mutation error to show it in a form. */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';
};
