'use server';

import { issueReviewsInternalToken } from './reviewsAuth';

export interface ReviewComment {
  id: string;
  offeringId: string;
  individualId: string;
  organizationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string | null;
  createdAt: string;
}

export interface ReviewCommentsResult {
  comments: ReviewComment[];
  average: number;
  count: number;
}

export interface NewReviewComment {
  rating: number;
  body?: string | null;
}

function reviewsApiBaseUrl(): string {
  const REVIEWS_API_BASE_URL = process.env.REVIEWS_API_BASE_URL;
  if (!REVIEWS_API_BASE_URL) {
    throw new Error('No se ha definido REVIEWS_API_BASE_URL');
  }
  return REVIEWS_API_BASE_URL;
}

/**
 * @summary Server-side proxy to read an offering's public comments.
 *
 * @param {string}  offeringId - `ProductOffering` id.
 * @returns {Promise<ReviewCommentsResult>} Comments, average and count.
 *
 * @throws {Error} `HTTP ${status}: ${body}` if `reviews-api` fails.
 */
export async function fetchOfferingComments(offeringId: string): Promise<ReviewCommentsResult> {
  const res = await fetch(
    `${reviewsApiBaseUrl()}/offerings/${encodeURIComponent(offeringId)}/comments`,
  );
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<ReviewCommentsResult>;
}

/**
 * @summary Server-side proxy to post a comment on an offering.
 *
 * @param {string}             offeringId - `ProductOffering` id.
 * @param {NewReviewComment}   payload - `rating` (1-5) and optional `body` (up to 1000 chars).
 * @returns {Promise<ReviewComment>} The created comment.
 *
 * @throws {Error} `HTTP 403: ...` if the active organization does not own the offering.
 * @throws {Error} `HTTP ${status}: ${body}` for other `reviews-api` errors.
 */
export async function createOfferingComment(
  offeringId: string,
  payload: NewReviewComment,
): Promise<ReviewComment> {
  const token = await issueReviewsInternalToken(offeringId);
  const res = await fetch(
    `${reviewsApiBaseUrl()}/offerings/${encodeURIComponent(offeringId)}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<ReviewComment>;
}
