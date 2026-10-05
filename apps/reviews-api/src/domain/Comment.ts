/** Integer rating of an offering, restricted to the 1-5 scale. */
export type Rating = 1 | 2 | 3 | 4 | 5;

/** Minimum accepted rating. */
export const RATING_MIN = 1;
/** Maximum accepted rating. */
export const RATING_MAX = 5;
/** Maximum length, in characters, of a comment body. */
export const BODY_MAX_LENGTH = 1000;

/** Comment on a `ProductOffering`. */
export interface Comment {
  id: string;
  offeringId: string;
  rating: Rating;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  // Here you define your business logic (e.g. author, moderation status...).
}

/**
 * Checks whether a value is a valid {@link Rating} (integer between 1 and 5).
 *
 * @param value - Value to validate.
 * @returns `true` if `value` is an integer within the 1-5 range.
 */
export const isValidRating = (value: number): value is Rating =>
  Number.isInteger(value) && value >= RATING_MIN && value <= RATING_MAX;

/**
 * Checks whether a comment body is valid: `null`/`undefined` (optional) or a string
 * of at most {@link BODY_MAX_LENGTH} characters.
 *
 * @param body - Comment body to validate.
 * @returns `true` if `body` is `null`/`undefined` or does not exceed the maximum length.
 */
export const isValidBody = (body: string | null | undefined): body is string | null =>
  body == null || body.length <= BODY_MAX_LENGTH;
