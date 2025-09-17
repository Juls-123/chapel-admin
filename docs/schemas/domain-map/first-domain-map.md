# 🗂 Domain Breakdown for Chapel Attendance Management System

## Overview

This domain map organizes the Chapel Attendance Management System into 5 cohesive domains, derived from user stories (US-001–US-021). Each domain includes modules, DB views, tables, indexes, triggers, and functions for Supabase/Postgres. **All retrieved data tables use client-side sorting**. The day counter (welcome message) is aesthetic on the frontend, backed by DB `timestamptz` for integrity (e.g., `admin_actions.created_at`). Soft deletes (`status`, `deleted_at`) replace `ON DELETE CASCADE` for auditability. The map addresses schema inefficiencies (merged `upload_history`, `service_datetime` as `timestamptz`, integrated semesters, added `warning_letters`) and covers edge cases (warning duplicates, atomic uploads). Use this to guide schema updates and UI investigation (e.g., map tabs: Services → Service Domain).

---

## 1. Student Domain

**Purpose**: Manages student identity, lifecycle, and data (core entity).

- **Student Registration Module**:
  - Individual add via form: first/middle/last name, matric number, level (100-500), gender, student/parent email, parent phone (US-012).
  - Bulk upload via CSV/Excel, atomic (all or none), logs errors (US-011).
- **Student Profile Data Module**:
  - Stores/displays matric number, full name, level, gender (male/female/other), student/parent email, parent phone, status (active/paused/deleted) (US-005, US-012).
- **Profile Edits Module**:
  - Update profile fields (name, gender, contacts, level); audit changes via admin actions (US-012).
- **Student History Module**:
  - Tracks attendance (present/absent/exempted), exeats, warnings per student (US-005, US-010).
- **Upload Errors Logging Module**:
  - Logs bulk upload failures (row number, error type: validation/duplicate, raw data) (US-011).
- **Associated Views**:
  - `vw_student_profile`: Student details + attendance/exeat/warning history (matric, name, level, gender, history) (US-005, US-012).
- **DB Elements**:

  - **Table**: `students`
    ```sql
    CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
    CREATE TYPE student_status_enum AS ENUM ('active', 'paused', 'deleted');
    CREATE TYPE level_enum AS ENUM ('100', '200', '300', '400', '500');
    CREATE TABLE students (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      matric_number text NOT NULL UNIQUE,
      first_name text NOT NULL,
      middle_name text,
      last_name text NOT NULL,
      full_name text GENERATED ALWAYS AS (trim(concat_ws(' ', first_name, middle_name, last_name))) STORED,
      gender gender_enum,
      level level_enum NOT NULL,
      email text,
      parent_email text,
      parent_phone text,
      status student_status_enum DEFAULT 'active',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz
    );
    ```
  - **Indexes**:
    ```sql
    CREATE INDEX idx_students_matric ON students(matric_number WHERE status != 'deleted');
    CREATE INDEX idx_students_level_status ON students(level, status WHERE status = 'active');
    ```
  - **Triggers/Functions**:

    ```sql
    CREATE OR REPLACE FUNCTION update_student_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_student_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_student_updated_at();

    CREATE OR REPLACE FUNCTION soft_delete_student()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.status = 'deleted';
      NEW.deleted_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_soft_delete_student
    BEFORE DELETE ON students
    FOR EACH ROW EXECUTE FUNCTION soft_delete_student();
    ```

  - **Notes**:
    - Gender (`gender_enum`) and level (`level_enum`) use ENUMs for stability.
    - Soft deletes (`status`, `deleted_at`) for auditability.
    - Client-side sorting for student tables (name, matric, email).
    - **Schema Feedback**: Add `gender_enum`, `level_enum`; your `full_name` trigger is efficient.

---

## 2. Service Domain

**Purpose**: Manages chapel services, semesters, schedules, and configurations.

- **Services Module**:
  - Create/edit: type (morning/evening/special), date/time (timestamptz), name (special), status (scheduled/active/completed/canceled).
  - Actions: copy ID, edit, cancel, view attendees (US-007, US-008).
- **Semester Module**:
  - Defines semesters (name, start/end dates) for absence tracking (US-013).
- **Service Constraints Module**:
  - Configurable rules (e.g., gender, level); UI filters (type, status, date picker), client-side sorting by date (US-008).
- **Service Templates Module**:
  - Admins define/use templates (props: name, type, suggested_levels array, default_constraints jsonb, description; e.g., "Christmas Carol") (US-007).
- **Service Export Module**:
  - Exports attendance (CSV/Excel: student details, status, timestamps) (US-009).
- **Service Status Prompt**:
  - Prompts admins to mark `completed` after all levels (100-500) have attendance (Reminder).
- **Associated Views**:
  - `vw_today_services`: Today’s services (type, datetime, status, attendance count) (US-004).
- **DB Elements**:

  - **Table**: `services`
    ```sql
    CREATE TYPE service_type_enum AS ENUM ('morning', 'evening', 'special');
    CREATE TYPE service_status_enum AS ENUM ('scheduled', 'active', 'completed', 'canceled');
    CREATE TABLE services (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type service_type_enum NOT NULL,
      name text,
      service_datetime timestamptz NOT NULL,
      status service_status_enum DEFAULT 'scheduled',
      created_by uuid REFERENCES admins(id),
      locked boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status service_status_enum DEFAULT 'active'
    );
    ```
  - **Table**: `semesters`
    ```sql
    CREATE TABLE semesters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `special_service_templates`
    ```sql
    CREATE TABLE special_service_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      type service_type_enum,
      suggested_levels level_enum[] DEFAULT '{}',
      default_constraints jsonb DEFAULT '{}',
      description text,
      created_by uuid REFERENCES admins(id),
      created_at timestamptz DEFAULT now(),
      is_active boolean DEFAULT true,
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `service_levels`
    ```sql
    CREATE TABLE service_levels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id uuid REFERENCES services(id),
      level_id level_enum,
      constraints jsonb DEFAULT '{}',
      UNIQUE(service_id, level_id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Indexes**:
    ```sql
    CREATE INDEX idx_services_datetime_status ON services(service_datetime, status WHERE status != 'deleted');
    CREATE INDEX idx_templates_name_active ON special_service_templates(name WHERE is_active = true AND status = 'active');
    CREATE INDEX idx_semesters_dates ON semesters(start_date, end_date WHERE status = 'active');
    CREATE INDEX idx_service_levels_service ON service_levels(service_id WHERE status = 'active');
    ```
  - **Triggers/Functions**:

    ```sql
    CREATE OR REPLACE FUNCTION lock_service()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE services
      SET locked = true
      WHERE id = NEW.service_id
      AND status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM service_levels sl
        WHERE sl.service_id = NEW.service_id AND sl.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM attendance_summary asum
          WHERE asum.service_id = sl.service_id AND asum.level_id = sl.level_id AND asum.status = 'active'
        )
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_lock_service
    AFTER INSERT ON attendance_summary
    FOR EACH ROW EXECUTE FUNCTION lock_service();

    CREATE OR REPLACE FUNCTION soft_delete_service()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.status = 'deleted';
      NEW.deleted_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_soft_delete_service
    BEFORE DELETE ON services
    FOR EACH ROW EXECUTE FUNCTION soft_delete_service();
    ```

    - Function `prompt_service_completion(service_id uuid)`: Checks `service_levels` vs. `attendance_summary` (status = 'active'); triggers UI prompt for `completed`.

- **Notes**:
  - `service_datetime` (timestamptz) resolves time dilemma (US-007).
  - ENUMs for `service_type`, `service_status`.
  - Soft deletes for `services`, `semesters`, `service_levels`, `special_service_templates`.
  - Client-side sorting for service tables.
  - **Schema Feedback**: Add `service_datetime` (timestamptz); your `service_status` ENUM is good. Add templates table.

---

## 3. Attendance Domain

**Purpose**: Tracks scanning, ingestion, presence/absence, and overrides.

- **Attendance Upload Module**:
  - Upload scanner reports (CSV/Excel) with date picker/service dropdown (disabled if no services); atomic (US-018).
- **Attendance Preview Module**:
  - Previews parsed records (matched/unmatched, matric numbers); no DB writes until confirmed (US-019).
- **Attendees & Absentees Module**:
  - Lists/counts for completed services/day (exempted for exeats); monthly top absentees; date picker/service filter, export (US-001, US-005, US-010).
- **Manual Overrides Module**:
  - Single/bulk clears with reasons (e.g., scanning error); persists selection state (US-010).
- **Manual Override Reasons Definition Module**:
  - Configurable reasons (e.g., ‘scanning_error’, requires_note boolean) (US-010).
- **Attendance Records Module**:
  - Normalized records (student_id, service_id, status: present/absent/exempted) for efficient queries (e.g., absences per semester) (new, per your feedback).
- **Upload History Module**:
  - Tracks uploads (success/failure, metadata: file_name, file_type) (US-020).
- **Issues Module**:
  - Logs/resolves unmatched scans/errors (e.g., student not registered) (US-021).
- **Attendance Summary Module**:
  - Daily stats for completed services (scanned, absentees, % change); daily reset (US-001).
- **Associated Views**:
  - `vw_daily_attendance_totals`: Present/absent/exempted for completed services (US-001).
  - `vw_monthly_top_absentees`: Top 5 absentees (profile, matric, count) (US-005).
- **DB Elements**:

  - **Table**: `attendance_batch_versions`
    ```sql
    CREATE TABLE attendance_batch_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id uuid REFERENCES services(id),
      level_id level_enum,
      version integer NOT NULL DEFAULT 1,
      attendees jsonb,
      absentees jsonb,
      unmatched jsonb,
      ingested_by uuid REFERENCES admins(id),
      ingested_at timestamptz,
      scan_archive_id uuid REFERENCES scan_archives(id),
      superseded_by uuid REFERENCES attendance_batch_versions(id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
      UNIQUE(service_id, level_id, version)
    );
    ```
  - **Table**: `attendance_records`
    ```sql
    CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'exempted');
    CREATE TABLE attendance_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id),
      service_id uuid REFERENCES services(id),
      status attendance_status_enum NOT NULL,
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
      UNIQUE(student_id, service_id)
    );
    ```
  - **Table**: `attendance_summary`
    ```sql
    CREATE TABLE attendance_summary (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id uuid REFERENCES services(id),
      level_id level_enum,
      total_students integer NOT NULL,
      total_present integer NOT NULL,
      total_absent integer NOT NULL,
      total_exempted integer NOT NULL,
      total_unmatched integer NOT NULL,
      generated_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
      UNIQUE(service_id, level_id)
    );
    ```
  - **Table**: `scan_archives`
    ```sql
    CREATE TABLE scan_archives (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id uuid REFERENCES services(id),
      level_id level_enum,
      uploaded_by uuid REFERENCES admins(id),
      file_url text NOT NULL,
      uploaded_at timestamptz DEFAULT now(),
      metadata jsonb DEFAULT '{}',
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `manual_overrides`
    ```sql
    CREATE TABLE manual_overrides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id),
      service_id uuid REFERENCES services(id),
      reason_id uuid REFERENCES override_reason_definitions(id),
      note text,
      overridden_by uuid REFERENCES admins(id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `upload_history`
    ```sql
    CREATE TABLE upload_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name text NOT NULL,
      file_type text NOT NULL CHECK (file_type IN ('students', 'attendance')),
      file_size bigint,
      mime_type text,
      uploaded_by uuid REFERENCES admins(id),
      status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
      records_processed integer DEFAULT 0,
      records_failed integer DEFAULT 0,
      records_total integer DEFAULT 0,
      processing_started_at timestamptz,
      processing_completed_at timestamptz,
      error_summary text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `upload_errors`
    ```sql
    CREATE TABLE upload_errors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      upload_id uuid REFERENCES upload_history(id),
      row_number integer NOT NULL,
      error_type text NOT NULL,
      error_message text NOT NULL,
      raw_data jsonb,
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `issues`
    ```sql
    CREATE TABLE issues (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id uuid REFERENCES services(id),
      level_id level_enum,
      issue_type text NOT NULL,
      details jsonb NOT NULL,
      raised_by uuid REFERENCES admins(id),
      raised_at timestamptz DEFAULT now(),
      resolved boolean DEFAULT false,
      resolved_at timestamptz,
      resolved_by uuid REFERENCES admins(id),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Indexes**:
    ```sql
    CREATE INDEX idx_attendance_batch_service_level ON attendance_batch_versions(service_id, level_id WHERE status = 'active');
    CREATE INDEX idx_attendance_records_student_service ON attendance_records(student_id, service_id WHERE status = 'active');
    CREATE INDEX idx_upload_history_status ON upload_history(status, created_at DESC WHERE status = 'active');
    CREATE INDEX idx_upload_history_file_type ON upload_history(file_type WHERE status = 'active');
    CREATE INDEX idx_issues_unresolved ON issues(service_id WHERE resolved = false AND status = 'active');
    CREATE INDEX idx_upload_errors_upload_id ON upload_errors(upload_id WHERE status = 'active');
    ```
  - **Triggers/Functions**:

    ```sql
    CREATE OR REPLACE FUNCTION update_upload_statistics()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE upload_history
      SET records_processed = (
        SELECT COUNT(*) FROM students WHERE upload_batch_id = NEW.upload_batch_id AND status = 'active'
      ) + (
        SELECT COUNT(*) FROM attendance_batch_versions WHERE id = NEW.id AND status = 'active'
      ),
      records_failed = (
        SELECT COUNT(*) FROM upload_errors WHERE upload_id = NEW.upload_batch_id AND status = 'active'
      )
      WHERE id = NEW.upload_batch_id AND status = 'active';
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_upload_stats
    AFTER INSERT ON students
    FOR EACH ROW WHEN (NEW.upload_batch_id IS NOT NULL AND NEW.status = 'active')
    EXECUTE FUNCTION update_upload_statistics();

    CREATE TRIGGER trg_update_upload_stats_attendance
    AFTER INSERT ON attendance_batch_versions
    FOR EACH ROW WHEN (NEW.status = 'active')
    EXECUTE FUNCTION update_upload_statistics();

    CREATE OR REPLACE FUNCTION finalize_upload_batch(batch_id uuid)
    RETURNS void AS $$
    DECLARE
      total_records integer;
      processed_records integer;
      error_count integer;
    BEGIN
      SELECT records_total INTO total_records FROM upload_history WHERE id = batch_id AND status = 'active';
      SELECT COALESCE(SUM(CASE WHEN file_type = 'students' THEN (SELECT COUNT(*) FROM students WHERE upload_batch_id = batch_id AND status = 'active')
                              WHEN file_type = 'attendance' THEN (SELECT COUNT(*) FROM attendance_batch_versions WHERE id = batch_id AND status = 'active')
                              ELSE 0 END), 0) INTO processed_records FROM upload_history WHERE id = batch_id AND status = 'active';
      SELECT COUNT(*) INTO error_count FROM upload_errors WHERE upload_id = batch_id AND status = 'active';
      UPDATE upload_history
      SET records_processed = processed_records,
          records_failed = error_count,
          status = CASE
            WHEN error_count = 0 AND processed_records = total_records THEN 'completed'
            WHEN processed_records > 0 AND error_count > 0 THEN 'partial'
            WHEN processed_records = 0 THEN 'failed'
            ELSE 'completed'
          END,
          processing_completed_at = now()
      WHERE id = batch_id AND status = 'active';
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION populate_attendance_records()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO attendance_records (student_id, service_id, status)
      SELECT (att->>'student_id')::uuid, NEW.service_id, 'present'
      FROM jsonb_array_elements(NEW.attendees) att
      WHERE NOT EXISTS (
        SELECT 1 FROM attendance_records ar
        WHERE ar.student_id = (att->>'student_id')::uuid AND ar.service_id = NEW.service_id AND ar.status = 'active'
      )
      ON CONFLICT DO NOTHING;

      INSERT INTO attendance_records (student_id, service_id, status)
      SELECT (abs->>'student_id')::uuid, NEW.service_id, CASE
        WHEN EXISTS (SELECT 1 FROM exeats e WHERE e.student_id = (abs->>'student_id')::uuid AND e.period @> s.service_datetime::date AND e.status = 'active')
        THEN 'exempted' ELSE 'absent' END
      FROM jsonb_array_elements(NEW.absentees) abs
      JOIN services s ON s.id = NEW.service_id
      WHERE NOT EXISTS (
        SELECT 1 FROM attendance_records ar
        WHERE ar.student_id = (abs->>'student_id')::uuid AND ar.service_id = NEW.service_id AND ar.status = 'active'
      )
      ON CONFLICT DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_populate_attendance_records
    AFTER INSERT ON attendance_batch_versions
    FOR EACH ROW WHEN (NEW.status = 'active')
    EXECUTE FUNCTION populate_attendance_records();
    ```

  - **Notes**:
    - `attendance_records` added for efficient queries (per your feedback).
    - Soft deletes for all tables.
    - Client-side sorting for absentees, uploads, issues.
    - **Schema Feedback**: Merged `upload_history`; add `attendance_records`. Good: `attendance_summary`, atomic functions.

---

## 4. Discipline Domain

**Purpose**: Manages consequences, exemptions, and long-term tracking.

- **Exeat Module**:
  - Create/manage: Student search (matric), start/end dates, optional reason, status (active/ended/canceled); daily ending counts (US-003, US-014, US-015).
- **Warning Letters Module**:
  - Generate/review/send: >2 misses/week triggers pending; escalation levels (1-3); sent to student/parent emails; bulk send, resend, PDF export (US-013).
- **Weekly Snapshot Module**:
  - Tracks weekly absences; no duplicate warnings, updates tally (US-013).
- **Semester Tracking Module**:
  - Tracks total absences per student per semester (US-013).
- **Associated Views**:
  - `vw_pending_warnings`: Pending warnings, new this week (US-002).
  - `vw_exeats_ending_today`: Exeats ending today (US-003).
  - `vw_semester_absences`: Student semester absence totals (US-013).
- **DB Elements**:

  - **Table**: `exeats`
    ```sql
    CREATE TABLE exeats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id),
      start_date date NOT NULL,
      end_date date NOT NULL,
      period daterange GENERATED ALWAYS AS (daterange(start_date, end_date + 1, '[)')) STORED,
      reason text,
      status text DEFAULT 'active' CHECK (status IN ('active', 'ended', 'canceled')),
      created_by uuid REFERENCES admins(id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `warning_weekly_snapshot`
    ```sql
    CREATE TABLE warning_weekly_snapshot (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id),
      week_start date NOT NULL,
      absences integer DEFAULT 0,
      warning_status text DEFAULT 'none' CHECK (warning_status IN ('none', 'pending', 'sent')),
      first_created_at timestamptz,
      last_updated_at timestamptz DEFAULT now(),
      sent_at timestamptz,
      sent_by uuid REFERENCES admins(id),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
      UNIQUE(student_id, week_start)
    );
    ```
  - **Table**: `warning_letters`
    ```sql
    CREATE TABLE warning_letters (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id),
      week_start date NOT NULL,
      level integer NOT NULL CHECK (level BETWEEN 1 AND 3),
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'canceled')),
      sent_at timestamptz,
      sent_by uuid REFERENCES admins(id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
      UNIQUE(student_id, week_start, level)
    );
    ```
  - **Table**: `semester_absences`
    ```sql
    CREATE TABLE semester_absences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id uuid REFERENCES students(id),
      semester_id uuid REFERENCES semesters(id),
      total_absences integer DEFAULT 0,
      updated_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
      UNIQUE(student_id, semester_id)
    );
    ```
  - **Indexes**:
    ```sql
    CREATE INDEX idx_exeats_period_gist ON exeats USING GIST (period WHERE status = 'active');
    CREATE INDEX idx_warning_student_week ON warning_weekly_snapshot(student_id, week_start WHERE status = 'active');
    CREATE INDEX idx_warning_letters_student_week ON warning_letters(student_id, week_start WHERE status = 'active');
    CREATE INDEX idx_semester_absences_student ON semester_absences(student_id WHERE status = 'active');
    ```
  - **Triggers/Functions**:

    ```sql
    CREATE OR REPLACE FUNCTION update_weekly_snapshot()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO warning_weekly_snapshot (student_id, week_start, absences, warning_status, first_created_at)
      SELECT ar.student_id, date_trunc('week', s.service_datetime)::date, COUNT(*) as absences,
             CASE WHEN COUNT(*) > 2 THEN 'pending' ELSE 'none' END, now()
      FROM attendance_records ar
      JOIN services s ON s.id = ar.service_id
      WHERE ar.status = 'absent' AND ar.status = 'active'
      AND s.status = 'active'
      GROUP BY ar.student_id, date_trunc('week', s.service_datetime)
      ON CONFLICT (student_id, week_start)
      DO UPDATE SET absences = excluded.absences,
                    warning_status = CASE WHEN excluded.absences > 2 THEN 'pending' ELSE warning_weekly_snapshot.warning_status END,
                    last_updated_at = now();

      INSERT INTO warning_letters (student_id, week_start, level, status, created_at)
      SELECT wws.student_id, wws.week_start,
             COALESCE((SELECT MAX(level) + 1 FROM warning_letters wl WHERE wl.student_id = wws.student_id AND wl.status = 'active'), 1),
             'pending', now()
      FROM warning_weekly_snapshot wws
      WHERE wws.warning_status = 'pending' AND wws.status = 'active'
      AND wws.absences > 2
      AND NOT EXISTS (
        SELECT 1 FROM warning_letters wl
        WHERE wl.student_id = wws.student_id AND wl.week_start = wws.week_start AND wl.status = 'active'
      )
      ON CONFLICT (student_id, week_start, level) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_weekly_snapshot
    AFTER INSERT ON attendance_records
    FOR EACH ROW WHEN (NEW.status = 'absent' AND NEW.status = 'active')
    EXECUTE FUNCTION update_weekly_snapshot();

    CREATE OR REPLACE FUNCTION update_semester_absences()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO semester_absences (student_id, semester_id, total_absences, updated_at)
      SELECT ar.student_id, sem.id, COUNT(*), now()
      FROM attendance_records ar
      JOIN services s ON s.id = ar.service_id
      JOIN semesters sem ON s.service_datetime BETWEEN sem.start_date AND sem.end_date
      WHERE ar.status = 'absent' AND ar.status = 'active'
      AND s.status = 'active'
      AND sem.status = 'active'
      GROUP BY ar.student_id, sem.id
      ON CONFLICT (student_id, semester_id)
      DO UPDATE SET total_absences = semester_absences.total_absences + excluded.total_absences,
                    updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_semester_absences
    AFTER INSERT ON attendance_records
    FOR EACH ROW WHEN (NEW.status = 'absent' AND NEW.status = 'active')
    EXECUTE FUNCTION update_semester_absences();
    ```

  - **Notes**:
    - `warning_letters` added with escalation levels (1-3) (per your feedback).
    - Soft deletes for all tables.
    - Client-side sorting for exeat/warning tables.
    - **Schema Feedback**: `warning_weekly_snapshot` is efficient; added `warning_letters`. Good: `exeats.period` daterange.

---

## 5. Admin/System Domain

**Purpose**: Cross-cutting admin features, configurations, and oversight.

- **Admin Roles Module**:
  - Create/edit/promote/delete admins (superadmin only; auto-verified via Supabase Auth, no email verification; roles: admin/superadmin) (US-016, US-017).
- **Admin Actions Logging Module**:
  - Tracks actions (e.g., create service, approve exeat, send warning) with admin/recipient/date (US-006).
- **Dashboard Widgets Module**:
  - Welcome counter (frontend aesthetic, backed by `admin_actions.created_at` timestamptz); stats for scanned/absentees/warnings/exeats/services/top absentees (US-001–006).
- **Config Definitions Module**:
  - User-editable: override reasons (e.g., ‘medical’, requires_note boolean), service constraints (e.g., {"gender": "male"}) (US-010, US-007).
- **Audit & Security Module**:
  - Enforces RLS, logs sensitive ops, attributes issue resolutions (US-021).
- **Associated Views**:
  - `vw_recent_admin_actions`: Recent actions (admin, action, recipient, date) (US-006).
- **DB Elements**:

  - **Table**: `admins`
    ```sql
    CREATE TYPE role_enum AS ENUM ('admin', 'superadmin');
    CREATE TABLE admins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      auth_user_id uuid,
      first_name text NOT NULL,
      middle_name text,
      last_name text NOT NULL,
      email text UNIQUE NOT NULL,
      role role_enum DEFAULT 'admin',
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `admin_actions`
    ```sql
    CREATE TABLE admin_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id uuid REFERENCES admins(id),
      action text NOT NULL,
      object_type text,
      object_id uuid,
      object_label text,
      details jsonb,
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `override_reason_definitions`
    ```sql
    CREATE TABLE override_reason_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      display_name text NOT NULL,
      description text,
      requires_note boolean DEFAULT false,
      is_active boolean DEFAULT true,
      created_by uuid REFERENCES admins(id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Table**: `service_constraint_definitions`
    ```sql
    CREATE TABLE service_constraint_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      constraint_rule jsonb NOT NULL,
      description text,
      is_active boolean DEFAULT true,
      created_by uuid REFERENCES admins(id),
      created_at timestamptz DEFAULT now(),
      deleted_at timestamptz,
      status text DEFAULT 'active' CHECK (status IN ('active', 'deleted'))
    );
    ```
  - **Indexes**:
    ```sql
    CREATE INDEX idx_admin_actions_recent ON admin_actions(created_at DESC WHERE status = 'active');
    CREATE INDEX idx_override_reasons_active ON override_reason_definitions(code WHERE is_active = true AND status = 'active');
    CREATE INDEX idx_service_constraints_active ON service_constraint_definitions(name WHERE is_active = true AND status = 'active');
    ```
  - **Triggers/Functions**:

    ```sql
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE OR REPLACE FUNCTION create_admin_account(email text, password text, role text)
    RETURNS uuid AS $$
    DECLARE
      user_id uuid;
    BEGIN
      SELECT auth.admin.createUser(
        json_build_object(
          'email', email,
          'password', password,
          'email_confirm', true,
          'user_metadata', json_build_object('role', role)
        )
      ) INTO user_id;
      INSERT INTO admins (auth_user_id, email, role, first_name, last_name, status)
      VALUES (user_id, email, role::role_enum, 'New', 'Admin', 'active');
      RETURN user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ```

  - **Notes**:
    - Day counter: Frontend aesthetic, uses `admin_actions.created_at`.
    - Client-side sorting for admin tables.
    - **Schema Feedback**: Add config tables; your `admins` is efficient.

---

## Reminders

- **Service Completion Prompt**: UI/backend prompt to mark `services.status` as `completed` after all levels (100-500) have `attendance_summary` entries.
- **DB Views**:
  - `vw_student_profile` (Student)
  - `vw_today_services` (Service)
  - `vw_daily_attendance_totals` (Attendance)
  - `vw_monthly_top_absentees` (Attendance)
  - `vw_pending_warnings` (Discipline)
  - `vw_exeats_ending_today` (Discipline)
  - `vw_semester_absences` (Discipline)
- **General**:
  - **Client-side sorting** for all tables.
  - Day counter: Frontend aesthetic, backed by `timestamptz`.
  - ENUMs: `gender`, `level`, `service_type`, `service_status`, `role`, `attendance_status`.
  - CHECKs: `warning_status`, `override_reason.code`.

---

## Why This Helps

- **Comprehensive**: Covers all user stories (US-001–US-021).
- **Consistent**: ENUMs for stable values (`gender`, `level`); CHECKs for dynamic (`warning_status`, `override_reason`).
- **Efficient**: `attendance_records` for queries; `warning_letters` for escalation; soft deletes for auditability.
- **Edge Cases**: Warning duplicates, atomic uploads, service completion, unmatched scans.
- **UI Alignment**: Maps to tabs (e.g., Services → Service Domain).
- **Schema Feedback**:
  - **Good**: `full_name` trigger, `upload_history` atomicity, `exeats.period`, `admin_actions` logging.
  - **Fixed**: Merged `upload_history`, added `service_datetime`, `attendance_records`, `warning_letters`, soft deletes.

---
