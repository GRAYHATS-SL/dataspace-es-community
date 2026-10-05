'use server';

import type { NewReviewComment, ReviewComment } from '@/types/api';

import { issueReviewsInternalToken } from './reviewsAuth';

/** Returns the reviews API base URL or throws when it is not configured. */
function reviewsApiBaseUrl(): string {
  const baseUrl = process.env.REVIEWS_API_BASE_URL;
  if (!baseUrl) throw new Error('REVIEWS_API_BASE_URL is not configured');
  return baseUrl;
}

/** Lists the review comments of a product offering. */
export async function fetchOfferingComments(offeringId: string): Promise<ReviewComment[]> {
  // Here you define your business logic (sorting, aggregation...).
  const res = await fetch(
    `${reviewsApiBaseUrl()}/offerings/${encodeURIComponent(offeringId)}/comments`,
  );
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<ReviewComment[]>;
}

/** Creates a review comment on a product offering. */
export async function createOfferingComment(
  offeringId: string,
  payload: NewReviewComment,
): Promise<ReviewComment> {
  // Here you define your business logic (payload validation...).
  const token = await issueReviewsInternalToken(offeringId);
  const res = await fetch(
    `${reviewsApiBaseUrl()}/offerings/${encodeURIComponent(offeringId)}/comments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  return res.json() as Promise<ReviewComment>;
}
