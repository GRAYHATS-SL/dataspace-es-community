/** Integer rating of an offering, on a 1-5 scale. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** Minimum allowed rating. */
export const RATING_MIN = 1;
/** Maximum allowed rating. */
export const RATING_MAX = 5;
/** Maximum comment body length, in characters. */
export const BODY_MAX_LENGTH = 1000;

/** Immutable comment by an organization on a purchased `ProductOffering`. */
export interface Comment {
  id: string;
  offeringId: string;
  individualId: string;
  organizationId: string;
  rating: Rating;
  body: string | null;
  createdAt: string;
}

/**
 * Checks whether a value is a valid {@link Rating}.
 *
 * @param value - Value to validate.
 * @returns `true` if `value` is an integer between 1 and 5.
 */
export const isValidRating = (value: number): value is Rating =>
  Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;

/**
 * Checks whether a comment body is valid.
 *
 * @param body - Comment body to validate.
 * @returns `true` if `body` is nullish or within the maximum length.
 */
export const isValidBody = (body: string | null | undefined): body is string | null =>
  body == null || body.length <= BODY_MAX_LENGTH;
