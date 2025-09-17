-- Chapel Attendance Management System - Database Schema
-- Ready for Supabase SQL Editor
-- System handles 3.5k students across 4 levels with atomic ingestion and audit trails

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core enums for type safety
CREATE TYPE role_enum AS ENUM ('admin', 'superadmin');
CREATE TYPE service_type AS ENUM ('morning', 'evening', 'special');
CREATE TYPE service_status AS ENUM ('scheduled', 'active', 'completed', 'canceled');
CREATE TYPE warning_status AS ENUM ('none', 'pending', 'sent');
CREATE TYPE override_reason AS ENUM ('late_exeat', 'scanning_error', 'manual_correction', 'permission', 'other');

-- Academic levels (100L, 200L, 300L, 400L)
CREATE TABLE levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- "100", "200", "300", "400"
  name text, -- optional display name
  created_at timestamptz DEFAULT now()
);

-- Student records with parent contact info for warnings
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matric_number text NOT NULL UNIQUE,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text,
  parent_email text, -- for warning letters
  parent_phone text,
  level_id uuid REFERENCES levels(id) NOT NULL,
  gender text CHECK (gender IN ('male', 'female')), -- for gender-specific services
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')), -- soft delete
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Admin accounts separate from auth for cleaner RBAC
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid, -- optional link to supabase auth.users
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role role_enum NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Services with locking after attendance ingestion
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type service_type NOT NULL,
  name text, -- required for special services
  service_date date NOT NULL, -- simplified to just date, no time tracking
  status service_status NOT NULL DEFAULT 'scheduled',
  created_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now(),
  locked_after_ingestion boolean DEFAULT false -- prevents editing once attendance exists
);

-- Which levels each service applies to with optional constraints
CREATE TABLE service_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id),
  constraints jsonb DEFAULT '{}', -- e.g., {"gender": "male"} for male-only services
  UNIQUE(service_id, level_id)
);

-- Archive of uploaded scanner files for audit trail
CREATE TABLE scan_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id),
  level_id uuid REFERENCES levels(id),
  uploaded_by uuid REFERENCES admins(id),
  file_url text NOT NULL, -- supabase storage URL
  uploaded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Versioned attendance batches - allows retries and overwrites while preserving history
CREATE TABLE attendance_batch_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) NOT NULL,
  level_id uuid REFERENCES levels(id) NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now(),
  ingested_at timestamptz, -- when admin confirmed ingestion
  attendees jsonb, -- [{student_id, matric}, ...]
  absentees jsonb, -- [{student_id, matric, reason, exempted}, ...]
  unmatched jsonb, -- [{name, matric}, ...] - unregistered scans
  scan_archive_id uuid REFERENCES scan_archives(id),
  superseded_by uuid REFERENCES attendance_batch_versions(id), -- points to replacement version
  UNIQUE(service_id, level_id, version)
);

-- Fast lookup for current active batch per service+level
CREATE TABLE current_attendance_batch (
  service_id uuid REFERENCES services(id),
  level_id uuid REFERENCES levels(id),
  batch_id uuid REFERENCES attendance_batch_versions(id),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY(service_id, level_id)
);

-- Pre-computed totals for dashboard performance
CREATE TABLE attendance_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id),
  level_id uuid REFERENCES levels(id),
  total_students integer NOT NULL,
  total_present integer NOT NULL,
  total_absent integer NOT NULL,
  total_exempted integer NOT NULL, -- students with valid exeats
  total_unmatched integer NOT NULL, -- scans that couldn't match to students
  generated_at timestamptz DEFAULT now(),
  UNIQUE(service_id, level_id)
);

-- Issues from ingestion (unmatched scans, validation errors)
CREATE TABLE issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id),
  level_id uuid REFERENCES levels(id),
  issue_type text NOT NULL, -- "student_not_registered", "duplicate_scan", etc.
  details jsonb NOT NULL, -- {name, matric, error_context}
  raised_by uuid REFERENCES admins(id),
  raised_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES admins(id)
);

-- Student exeat periods with daterange for efficient overlap checks
CREATE TABLE exeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled'))
);

-- Add computed daterange column for fast overlap queries
ALTER TABLE exeats ADD COLUMN period daterange GENERATED ALWAYS AS (daterange(start_date, end_date + 1, '[)')) STORED;

-- Manual admin corrections to attendance records
CREATE TABLE manual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  service_id uuid REFERENCES services(id),
  level_id uuid REFERENCES levels(id),
  overridden_by uuid REFERENCES admins(id),
  reason override_reason NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Weekly snapshots for warning letter generation (Mon-Sun weeks)
CREATE TABLE warning_weekly_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id),
  week_start date NOT NULL, -- Monday of ISO week
  absences integer DEFAULT 0,
  warning_status warning_status DEFAULT 'none',
  first_created_at timestamptz, -- when warning first triggered
  last_updated_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  sent_by uuid REFERENCES admins(id),
  UNIQUE(student_id, week_start)
);

-- Immutable audit log for all admin actions
CREATE TABLE admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admins(id),
  action text NOT NULL, -- "created_service", "sent_warning", "approved_exeat"
  object_type text, -- "student", "service", "exeat"
  object_id uuid,
  object_label text, -- denormalized name/identifier for display
  details jsonb, -- additional context
  created_at timestamptz DEFAULT now()
);

-- Track atomic upload attempts for debugging
CREATE TABLE upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid REFERENCES admins(id),
  filename text,
  level_id uuid REFERENCES levels(id),
  service_date date,
  status text CHECK (status IN ('pending', 'success', 'failed')),
  error_details jsonb, -- detailed error info for failed uploads
  created_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_students_level ON students (level_id) WHERE status = 'active';
CREATE INDEX idx_students_matric ON students (matric_number) WHERE status = 'active';
CREATE INDEX idx_attendance_batch_service_level ON attendance_batch_versions (service_id, level_id);
CREATE INDEX idx_services_date_status ON services (service_date, status);
CREATE INDEX idx_exeats_period_gist ON exeats USING GIST (period) WHERE status = 'active';
CREATE INDEX idx_warning_by_week ON warning_weekly_snapshot (week_start);
CREATE INDEX idx_warning_by_student_week ON warning_weekly_snapshot (student_id, week_start);
CREATE INDEX idx_issues_unresolved ON issues (service_id, level_id) WHERE resolved = false;
CREATE INDEX idx_upload_history_recent ON upload_history (uploaded_by, created_at DESC);
CREATE INDEX idx_admin_actions_recent ON admin_actions (created_at DESC);

-- Dashboard views for efficient queries
CREATE VIEW vw_daily_attendance_totals AS
SELECT 
  s.service_date,
  s.type AS service_type,
  SUM(asum.total_present) AS total_present,
  SUM(asum.total_absent) AS total_absent,
  SUM(asum.total_exempted) AS total_exempted
FROM services s
JOIN attendance_summary asum ON asum.service_id = s.id
WHERE s.status != 'canceled'
GROUP BY s.service_date, s.type;

-- Recent admin actions with object details for dashboard
CREATE VIEW vw_recent_admin_actions AS
SELECT 
  aa.id,
  a.first_name || ' ' || a.last_name AS admin_name,
  aa.action,
  aa.object_type,
  aa.object_label,
  aa.created_at
FROM admin_actions aa
JOIN admins a ON a.id = aa.admin_id
ORDER BY aa.created_at DESC
LIMIT 50;

-- Top absentees for current month
CREATE VIEW vw_monthly_top_absentees AS
SELECT 
  st.id,
  st.first_name,
  st.last_name, 
  st.matric_number,
  SUM(ws.absences) AS month_absences
FROM warning_weekly_snapshot ws
JOIN students st ON st.id = ws.student_id
WHERE date_trunc('month', ws.week_start) = date_trunc('month', (now() AT TIME ZONE 'Africa/Lagos')::date)
  AND st.status = 'active'
GROUP BY st.id, st.first_name, st.last_name, st.matric_number
ORDER BY month_absences DESC
LIMIT 5;

-- Admin-configurable service constraints and override reasons
CREATE TABLE service_constraint_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- "Male Only", "Female Only", "Final Year Only"
  constraint_rule jsonb NOT NULL, -- {"gender": "male"} or {"level_codes": ["400"]}
  description text,
  created_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE TABLE override_reason_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, -- maps to override_reason enum values
  display_name text NOT NULL, -- "Late Exeat Submission"
  description text,
  requires_note boolean DEFAULT false, -- force admin to add explanation
  created_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Special service name templates for quick creation
CREATE TABLE special_service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- "Founders Day Service", "Christmas Carol"
  suggested_levels text[] DEFAULT '{}', -- ["100", "200", "300", "400"]
  created_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Seed default constraint definitions
INSERT INTO service_constraint_definitions (name, constraint_rule, description) VALUES
('Male Students Only', '{"gender": "male"}', 'Service restricted to male students'),
('Female Students Only', '{"gender": "female"}', 'Service restricted to female students'),
('Final Year Only', '{"level_codes": ["400"]}', 'Service for 400L students only'),
('No Freshers', '{"exclude_level_codes": ["100"]}', 'Service excluding 100L students');

-- Seed default override reasons
INSERT INTO override_reason_definitions (code, display_name, description, requires_note) VALUES
('late_exeat', 'Late Exeat Submission', 'Exeat was submitted after absence was recorded', true),
('scanning_error', 'Scanner Error', 'Technical issue with attendance scanner', false),
('manual_correction', 'Manual Correction', 'Admin correction of attendance record', true),
('permission', 'Special Permission', 'Student had official permission to be absent', true),
('other', 'Other Reason', 'Custom reason requiring explanation', true);

-- Seed default special service templates
INSERT INTO special_service_templates (name, suggested_levels) VALUES
('Founders Day Service', ARRAY['100', '200', '300', '400']),
('Christmas Carol Service', ARRAY['100', '200', '300', '400']),
('New Year Service', ARRAY['100', '200', '300', '400']),
('Graduation Service', ARRAY['400']);

-- Seed data for academic levels
INSERT INTO levels (code, name) VALUES 
('100', '100 Level'),
('200', '200 Level'), 
('300', '300 Level'),
('400', '400 Level');