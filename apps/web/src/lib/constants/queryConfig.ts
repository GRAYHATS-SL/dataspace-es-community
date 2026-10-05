const MINUTE = 60_000;

export const STALE_TIME = {
  /** Transactional data: orders */
  TRANSACTIONAL: 30 * 1000,
  /** Active catalog data: catalogs, categories, offerings */
  CATALOG: MINUTE,
  /** Stable catalog data: specifications, prices */
  STABLE: 5 * MINUTE,
} as const;

export const GC_TIME = {
  DEFAULT: 5 * MINUTE,
} as const;
