export const PAGE_PARAM = 'page';

/** Clones `current` and applies `updates`; empty values remove the key. */
export const withUpdatedParams = (
  current: URLSearchParams,
  updates: Record<string, string | number | undefined | null>,
): URLSearchParams => {
  const next = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, String(value));
  });
  return next;
};
