ALTER TABLE "user" ADD COLUMN "approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "requested_at" timestamp;