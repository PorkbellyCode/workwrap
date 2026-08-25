CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memo" ADD COLUMN "category_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "memo" ADD COLUMN "log_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo" ADD CONSTRAINT "memo_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memo_user_id_log_date_idx" ON "memo" USING btree ("user_id","log_date");--> statement-breakpoint
-- memo.category_id가 NOT NULL이라 카테고리가 0개면 메모를 쓸 수 없다.
-- 사용자 전원에게 기본 카테고리 'Work'를 하나씩 만들어 그 상태를 없앤다.
-- id는 lib/id.ts와 같은 `접두사_UUID(하이픈 제거)` 형식.
INSERT INTO "category" ("id", "user_id", "name")
SELECT 'cat_' || replace(gen_random_uuid()::text, '-', ''), u."id", 'Work'
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM "category" c WHERE c."user_id" = u."id");
