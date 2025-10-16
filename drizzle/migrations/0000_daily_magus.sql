CREATE TYPE "public"."devotion_type" AS ENUM('morning', 'evening');--> statement-breakpoint
CREATE TYPE "public"."gender_constraint" AS ENUM('male', 'female', 'both');--> statement-breakpoint
CREATE TYPE "public"."override_reason" AS ENUM('late_exeat', 'scanning_error', 'manual_correction', 'permission', 'other');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('admin', 'superadmin');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('scheduled', 'active', 'completed', 'canceled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('devotion', 'special', 'seminar');--> statement-breakpoint
CREATE TYPE "public"."warning_status" AS ENUM('none', 'pending', 'sent');--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"action" text NOT NULL,
	"object_type" text,
	"object_id" uuid,
	"object_label" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" uuid,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"role" "role_enum" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "admins_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "attendance_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_upload_id" uuid NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"raw_path" text NOT NULL,
	"attendees_path" text NOT NULL,
	"absentees_path" text NOT NULL,
	"issues_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"exempted_path" text
);
--> statement-breakpoint
CREATE TABLE "attendance_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attendance_batch_id" uuid NOT NULL,
	"student_id" uuid,
	"issue_type" text NOT NULL,
	"issue_description" text NOT NULL,
	"raw_data" jsonb,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_hash" text NOT NULL,
	"service_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "levels_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "manual_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"service_id" uuid,
	"level_id" uuid,
	"overridden_by" uuid,
	"reason" "override_reason" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "override_reason_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"requires_note" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true,
	CONSTRAINT "override_reason_definitions_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "service_levels_unique" UNIQUE("service_id","level_id")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"service_date" date NOT NULL,
	"status" "service_status" DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"locked_after_ingestion" boolean DEFAULT false,
	"service_type" "service_type" NOT NULL,
	"devotion_type" "devotion_type",
	"gender_constraint" "gender_constraint" DEFAULT 'both',
	"service_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_upload_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_upload_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"error_type" text NOT NULL,
	"error_message" text NOT NULL,
	"raw_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_hash" text NOT NULL,
	"storage_path" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"matric_number" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"email" text,
	"parent_email" text,
	"parent_phone" text,
	"level_id" uuid NOT NULL,
	"gender" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"full_name" text,
	"department" text,
	"upload_batch_id" uuid,
	CONSTRAINT "students_matric_number_key" UNIQUE("matric_number"),
	CONSTRAINT "students_gender_check" CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
	CONSTRAINT "students_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]))
);
--> statement-breakpoint
CREATE TABLE "test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_batches" ADD CONSTRAINT "attendance_batches_attendance_upload_id_fkey" FOREIGN KEY ("attendance_upload_id") REFERENCES "public"."attendance_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_issues" ADD CONSTRAINT "attendance_issues_attendance_batch_id_fkey" FOREIGN KEY ("attendance_batch_id") REFERENCES "public"."attendance_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_issues" ADD CONSTRAINT "attendance_issues_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_issues" ADD CONSTRAINT "attendance_issues_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_uploads" ADD CONSTRAINT "attendance_uploads_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_uploads" ADD CONSTRAINT "attendance_uploads_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_uploads" ADD CONSTRAINT "attendance_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_overridden_by_fkey" FOREIGN KEY ("overridden_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_overrides" ADD CONSTRAINT "manual_overrides_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "override_reason_definitions" ADD CONSTRAINT "override_reason_definitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_levels" ADD CONSTRAINT "service_levels_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_levels" ADD CONSTRAINT "service_levels_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_upload_errors" ADD CONSTRAINT "student_upload_errors_student_upload_id_fkey" FOREIGN KEY ("student_upload_id") REFERENCES "public"."student_uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_uploads" ADD CONSTRAINT "student_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_actions_recent" ON "admin_actions" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_batches_created_at" ON "attendance_batches" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_batches_upload_id" ON "attendance_batches" USING btree ("attendance_upload_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_issues_batch_id" ON "attendance_issues" USING btree ("attendance_batch_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_issues_issue_type" ON "attendance_issues" USING btree ("issue_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_issues_resolved" ON "attendance_issues" USING btree ("resolved" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_issues_student_id" ON "attendance_issues" USING btree ("student_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_uploads_file_hash" ON "attendance_uploads" USING btree ("file_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_uploads_service_level" ON "attendance_uploads" USING btree ("service_id" uuid_ops,"level_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_attendance_uploads_uploaded_at" ON "attendance_uploads" USING btree ("uploaded_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_service_levels_level_id" ON "service_levels" USING btree ("level_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_service_levels_service_id" ON "service_levels" USING btree ("service_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_service_levels_service_level" ON "service_levels" USING btree ("service_id" uuid_ops,"level_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_services_date_status" ON "services" USING btree ("service_date" date_ops,"status" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_services_date_time" ON "services" USING btree ("service_date" time_ops,"service_time" date_ops);--> statement-breakpoint
CREATE INDEX "idx_services_devotion_type" ON "services" USING btree ("devotion_type" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_services_gender_constraint" ON "services" USING btree ("gender_constraint" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_services_service_date" ON "services" USING btree ("service_date" date_ops);--> statement-breakpoint
CREATE INDEX "idx_services_service_type" ON "services" USING btree ("service_type" enum_ops);--> statement-breakpoint
CREATE INDEX "idx_services_time" ON "services" USING btree ("service_time" time_ops);--> statement-breakpoint
CREATE INDEX "idx_student_upload_errors_error_type" ON "student_upload_errors" USING btree ("error_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_student_upload_errors_upload_id" ON "student_upload_errors" USING btree ("student_upload_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_student_uploads_file_hash" ON "student_uploads" USING btree ("file_hash" text_ops);--> statement-breakpoint
CREATE INDEX "idx_student_uploads_uploaded_at" ON "student_uploads" USING btree ("uploaded_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_student_uploads_uploaded_by" ON "student_uploads" USING btree ("uploaded_by" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_students_level" ON "students" USING btree ("level_id" uuid_ops) WHERE (status = 'active'::text);--> statement-breakpoint
CREATE INDEX "idx_students_matric" ON "students" USING btree ("matric_number" text_ops) WHERE (status = 'active'::text);--> statement-breakpoint
CREATE INDEX "idx_students_upload_batch_id" ON "students" USING btree ("upload_batch_id" uuid_ops);--> statement-breakpoint
CREATE VIEW "public"."vw_recent_admin_actions" AS (SELECT aa.id, aa.action, aa.created_at, aa.object_type, aa.object_label, concat(a.first_name, ' ', a.last_name) AS admin_name FROM admin_actions aa JOIN admins a ON aa.admin_id = a.id ORDER BY aa.created_at DESC LIMIT 50);--> statement-breakpoint
CREATE VIEW "public"."vw_service_level_details" AS (SELECT s.id AS service_id, s.name AS service_name, s.service_date, s.service_time, s.service_type, l.id AS level_id, l.code AS level_code, l.name AS level_name, sl.created_at AS assigned_at FROM services s JOIN service_levels sl ON s.id = sl.service_id JOIN levels l ON sl.level_id = l.id ORDER BY s.service_date DESC, s.service_time, l.code);--> statement-breakpoint
CREATE VIEW "public"."vw_services_with_datetime" AS (SELECT id, name, service_date, status, created_by, created_at, locked_after_ingestion, service_type, devotion_type, gender_constraint, service_time, service_date + service_time AS service_datetime FROM services);--> statement-breakpoint
CREATE VIEW "public"."vw_services_with_levels" AS (SELECT s.id, s.name, s.service_date, s.status, s.created_by, s.created_at, s.locked_after_ingestion, s.service_type, s.devotion_type, s.gender_constraint, s.service_time, array_agg(l.code ORDER BY l.code) AS level_codes, array_agg(l.name ORDER BY l.code) AS level_names, count(sl.level_id) AS level_count FROM services s LEFT JOIN service_levels sl ON s.id = sl.service_id LEFT JOIN levels l ON sl.level_id = l.id GROUP BY s.id, s.name, s.service_date, s.service_time, s.service_type, s.devotion_type, s.gender_constraint, s.status, s.created_at);