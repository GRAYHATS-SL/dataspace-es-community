/** Explicit result of an operation that may fail, without resorting to exceptions. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Builds a successful {@link Result}.
 *
 * @param value - Success value.
 * @returns A `Result` with `ok: true`.
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Builds a failed {@link Result}.
 *
 * @param error - Error value.
 * @returns A `Result` with `ok: false`.
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
