CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_range" CHECK ("comments"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "body_max_length" CHECK (char_length("comments"."body") <= 1000)
);
--> statement-breakpoint
CREATE INDEX "idx_comments_offering_id" ON "comments" USING btree ("offering_id");