CREATE TYPE "public"."memo_follow_up" AS ENUM('open', 'resolved');--> statement-breakpoint
ALTER TABLE "memo" ADD COLUMN "follow_up" "memo_follow_up";--> statement-breakpoint
ALTER TABLE "memo" ADD COLUMN "resolved_at" timestamp;