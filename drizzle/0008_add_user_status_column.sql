CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" "user_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
-- 기존 approved=true 사용자를 'active'로 백필한다. 나머지(approved=false)는
-- 컬럼 기본값 'pending'을 그대로 쓴다. approved 컬럼 자체는 다음 마이그레이션에서 제거한다.
UPDATE "user" SET "status" = 'active' WHERE "approved" = true;
