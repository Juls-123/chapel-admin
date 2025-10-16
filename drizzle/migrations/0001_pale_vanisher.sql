CREATE TABLE "exeats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"status" text DEFAULT 'active',
	"period" daterange GENERATED ALWAYS AS (daterange(start_date, (end_date + 1), '[)'::text)) STORED,
	CONSTRAINT "exeats_status_check" CHECK (status = ANY (ARRAY['active'::text, 'ended'::text, 'cancelled'::text]))
);
--> statement-breakpoint
ALTER TABLE "exeats" ADD CONSTRAINT "exeats_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exeats" ADD CONSTRAINT "exeats_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_exeats_period_gist" ON "exeats" USING gist ("period" range_ops) WHERE (status = 'active'::text);