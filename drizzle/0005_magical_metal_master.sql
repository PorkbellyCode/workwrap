ALTER TABLE "summary" ADD COLUMN "category_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "summary" ADD COLUMN "memo_ids" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "summary" ADD CONSTRAINT "summary_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;