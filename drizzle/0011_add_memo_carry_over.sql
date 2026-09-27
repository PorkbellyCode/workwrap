ALTER TABLE "memo" ADD COLUMN "carry_over" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- 이어가기 중이던 메모만 옮긴다. 'resolved'는 "해결" 개념을 없애면서 일반 메모(false)로 돌아간다.
-- follow_up / resolved_at 컬럼 자체는 다음 마이그레이션(0012)에서 제거한다.
UPDATE "memo" SET "carry_over" = true WHERE "follow_up" = 'open';
