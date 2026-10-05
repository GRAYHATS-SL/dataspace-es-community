/** Review comment left on a product offering (reviews API). */
export interface ReviewComment {
  id: string;
  offeringId: string;
  individualId: string;
  organizationId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string | null;
  createdAt: string;
}

/** Create payload for a review comment. */
export interface NewReviewComment {
  rating: number;
  body?: string | null;
}
