ALTER TYPE "public"."service_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TABLE "exeats" DROP CONSTRAINT "exeats_status_check";--> statement-breakpoint
ALTER TABLE "exeats" ADD CONSTRAINT "exeats_status_check" CHECK (status = ANY (ARRAY['active'::text, 'ended'::text, 'cancelled'::text]));