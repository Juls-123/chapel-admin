-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  object_type text,
  object_id uuid,
  object_label text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_actions_pkey PRIMARY KEY (id),
  CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id)
);
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role USER-DEFINED NOT NULL DEFAULT 'admin'::role_enum,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.attendance_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attendance_upload_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  raw_path text NOT NULL,
  attendees_path text NOT NULL,
  absentees_path text NOT NULL,
  issues_path text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_batches_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_batches_attendance_upload_id_fkey FOREIGN KEY (attendance_upload_id) REFERENCES public.attendance_uploads(id)
);
CREATE TABLE public.attendance_issues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  attendance_batch_id uuid NOT NULL,
  student_id uuid,
  issue_type text NOT NULL,
  issue_description text NOT NULL,
  raw_data jsonb,
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_issues_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_issues_attendance_batch_id_fkey FOREIGN KEY (attendance_batch_id) REFERENCES public.attendance_batches(id),
  CONSTRAINT attendance_issues_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_issues_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admins(id)
);
CREATE TABLE public.attendance_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_hash text NOT NULL,
  service_id uuid NOT NULL,
  level_id uuid NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.admins(id),
  CONSTRAINT attendance_uploads_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT attendance_uploads_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id)
);
CREATE TABLE public.exeats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'ended'::text, 'cancelled'::text])),
  period daterange DEFAULT daterange(start_date, (end_date + 1), '[)'::text),
  CONSTRAINT exeats_pkey PRIMARY KEY (id),
  CONSTRAINT exeats_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT exeats_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT levels_pkey PRIMARY KEY (id)
);
CREATE TABLE public.manual_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  service_id uuid,
  level_id uuid,
  overridden_by uuid,
  reason USER-DEFINED NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT manual_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT manual_overrides_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT manual_overrides_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT manual_overrides_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id),
  CONSTRAINT manual_overrides_overridden_by_fkey FOREIGN KEY (overridden_by) REFERENCES public.admins(id)
);
CREATE TABLE public.override_reason_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  requires_note boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  CONSTRAINT override_reason_definitions_pkey PRIMARY KEY (id),
  CONSTRAINT override_reason_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.semesters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT semesters_pkey PRIMARY KEY (id)
);
CREATE TABLE public.service_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  level_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_levels_pkey PRIMARY KEY (id),
  CONSTRAINT service_levels_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT service_levels_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  service_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'scheduled'::service_status,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  locked_after_ingestion boolean DEFAULT false,
  service_type USER-DEFINED NOT NULL,
  devotion_type USER-DEFINED,
  gender_constraint USER-DEFINED DEFAULT 'both'::gender_constraint,
  service_time time without time zone NOT NULL,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id)
);
CREATE TABLE public.student_upload_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_upload_id uuid NOT NULL,
  row_number integer NOT NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  raw_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_upload_errors_pkey PRIMARY KEY (id),
  CONSTRAINT student_upload_errors_student_upload_id_fkey FOREIGN KEY (student_upload_id) REFERENCES public.student_uploads(id)
);
CREATE TABLE public.student_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_hash text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT student_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.admins(id)
);
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  matric_number text NOT NULL UNIQUE,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text,
  parent_email text,
  parent_phone text,
  level_id uuid NOT NULL,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text])),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  full_name text,
  department text,
  upload_batch_id uuid,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id)
);