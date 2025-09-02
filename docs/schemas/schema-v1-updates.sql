-- Ensure students.full_name exists, backfill, and keep it in sync via trigger
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS full_name text;

UPDATE students
SET full_name = trim(both ' ' from concat_ws(' ', first_name, middle_name, last_name))
WHERE full_name IS NULL OR trim(full_name) = '';

CREATE OR REPLACE FUNCTION update_student_full_name()
RETURNS trigger AS $$
BEGIN
  NEW.full_name := trim(both ' ' from concat_ws(' ', NEW.first_name, NEW.middle_name, NEW.last_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_student_full_name ON students;
CREATE TRIGGER trg_update_student_full_name
BEFORE INSERT OR UPDATE OF first_name, middle_name, last_name
ON students
FOR EACH ROW
EXECUTE FUNCTION update_student_full_name();


-- ===============================================
-- STEP 1: Warning Letters Table
-- ===============================================
CREATE TABLE IF NOT EXISTS warning_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id),
  warning_type text NOT NULL CHECK (warning_type IN ('first', 'second', 'final')),
  issued_at timestamptz DEFAULT now(),
  notes text
);

-- ===============================================
-- STEP 2: Student Profile View
-- (when opening a student's profile, attendance records + services)
-- ===============================================
CREATE OR REPLACE VIEW vw_student_profile AS
SELECT
  st.id AS student_id,
  st.matric_number,
  st.first_name,
  st.middle_name,
  st.last_name,
  st.full_name,
  st.level_id,
  s.id AS service_id,
  s.name AS service_name,
  s.service_date,
  COALESCE(asum.total_present, 0) AS total_present,
  COALESCE(asum.total_absent, 0) AS total_absent,
  COALESCE(asum.total_exempted, 0) AS total_exempted
FROM students st
LEFT JOIN attendance_summary asum
  ON st.level_id = asum.level_id
LEFT JOIN services s
  ON s.id = asum.service_id;

-- ===============================================
-- STEP 3: Semester Absences Table
-- For quick lookups (without duplication)
-- ===============================================
CREATE TABLE IF NOT EXISTS semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semester_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  semester_id uuid REFERENCES semesters(id) ON DELETE CASCADE,
  total_absences integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, semester_id)
);

-- ===============================================
-- STEP 4: Service Levels
-- (link services to multiple levels e.g., 200+400 together)
-- ===============================================
CREATE TABLE IF NOT EXISTS service_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id) ON DELETE CASCADE,
  UNIQUE(service_id, level_id)
);

-- ===============================================
-- STEP 5: Weekly Snapshot Table
-- ===============================================
CREATE TABLE IF NOT EXISTS warning_weekly_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  level_id uuid REFERENCES levels(id),
  week_start_date date NOT NULL,
  total_absences integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, week_start_date)
);

-- ===============================================
-- STEP 6: Supabase Auth (handled externally)
-- No SQL — handled via Supabase policies & JWT claims
-- ===============================================

-- ===============================================
-- STEP 7: Audit Columns (status for audit purposes)
-- ===============================================
ALTER TABLE services
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- ===============================================
-- STEP 8: Manual Override Definitions + Constraint Definitions
-- ===============================================
CREATE TABLE IF NOT EXISTS override_reason_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  override_reason_id uuid REFERENCES override_reason_definitions(id),
  applied_by uuid REFERENCES admins(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_constraint_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ===============================================
-- EXTRA FIX: Full Name Column (safe trigger-based approach)
-- ===============================================
ALTER TABLE students
ADD COLUMN IF NOT EXISTS full_name text;

-- backfill
UPDATE students
SET full_name = trim(both ' ' from concat_ws(' ', first_name, middle_name, last_name));

-- function to keep it in sync
CREATE OR REPLACE FUNCTION update_student_full_name()
RETURNS trigger AS $$
BEGIN
  NEW.full_name := trim(both ' ' from concat_ws(' ', NEW.first_name, NEW.middle_name, NEW.last_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger to auto-update
DROP TRIGGER IF EXISTS trg_update_student_full_name ON students;
CREATE TRIGGER trg_update_student_full_name
BEFORE INSERT OR UPDATE OF first_name, middle_name, last_name
ON students
FOR EACH ROW
EXECUTE FUNCTION update_student_full_name();
