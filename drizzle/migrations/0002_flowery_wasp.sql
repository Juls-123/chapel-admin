ALTER TABLE "test" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "test" CASCADE;--> statement-breakpoint
ALTER TABLE "exeats" DROP CONSTRAINT "exeats_status_check";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "status" SET DEFAULT 'scheduled'::text;--> statement-breakpoint
DROP TYPE "public"."service_status";--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('scheduled', 'active', 'completed', 'canceled');--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "status" SET DEFAULT 'scheduled'::"public"."service_status";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "status" SET DATA TYPE "public"."service_status" USING "status"::"public"."service_status";--> statement-breakpoint
ALTER TABLE "exeats" ADD CONSTRAINT "exeats_status_check" CHECK (status = ANY (ARRAY['active'::text, 'ended'::text, 'canceled'::text]));