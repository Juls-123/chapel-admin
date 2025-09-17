-- Migration 004: Add Triggers and Functions
-- Run Date: [YYYY-MM-DD]
-- Description: Adds business logic triggers and utility functions

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to implement soft delete
CREATE OR REPLACE FUNCTION soft_delete_record()
RETURNS TRIGGER AS $$
BEGIN
    NEW.entity_status = 'deleted';
    NEW.deleted_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to populate attendance records from batch versions
CREATE OR REPLACE FUNCTION populate_attendance_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert present students
    INSERT INTO public.attendance_records (student_id, service_id, status)
    SELECT (att->>'student_id')::uuid, NEW.service_id, 'present'::attendance_status_enum
    FROM jsonb_array_elements(NEW.attendees) att
    WHERE (att->>'student_id') IS NOT NULL
    ON CONFLICT (student_id, service_id) DO NOTHING;

    -- Insert absent students (check for exeats to mark as exempted)
    INSERT INTO public.attendance_records (student_id, service_id, status)
    SELECT 
        (abs->>'student_id')::uuid, 
        NEW.service_id, 
        CASE
            WHEN EXISTS (
                SELECT 1 FROM public.exeats e 
                JOIN public.services s ON s.id = NEW.service_id
                WHERE e.student_id = (abs->>'student_id')::uuid 
                AND e.period @> s.service_date 
                AND e.entity_status = 'active'
                AND e.status = 'active'
            )
            THEN 'exempted'::attendance_status_enum
            ELSE 'absent'::attendance_status_enum
        END
    FROM jsonb_array_elements(NEW.absentees) abs
    WHERE (abs->>'student_id') IS NOT NULL
    ON CONFLICT (student_id, service_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update weekly snapshots and warning letters
CREATE OR REPLACE FUNCTION update_weekly_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    week_start_date date;
    absence_count integer;
BEGIN
    -- Calculate week start (Monday)
    week_start_date := date_trunc('week', (
        SELECT s.service_date 
        FROM public.services s 
        WHERE s.id = NEW.service_id
    ))::date;

    -- Count absences for this student in this week
    SELECT COUNT(*) INTO absence_count
    FROM public.attendance_records ar
    JOIN public.services s ON s.id = ar.service_id
    WHERE ar.student_id = NEW.student_id
    AND ar.status = 'absent'
    AND date_trunc('week', s.service_date)::date = week_start_date
    AND ar.entity_status = 'active'
    AND s.entity_status = 'active';

    -- Insert or update weekly snapshot
    INSERT INTO public.warning_weekly_snapshot (
        student_id, week_start, absences, warning_status, first_created_at
    )
    VALUES (
        NEW.student_id, 
        week_start_date, 
        absence_count,
        CASE WHEN absence_count > 2 THEN 'pending'::warning_status_enum ELSE 'none'::warning_status_enum END,
        now()
    )
    ON CONFLICT (student_id, week_start)
    DO UPDATE SET
        absences = absence_count,
        warning_status = CASE 
            WHEN absence_count > 2 AND warning_weekly_snapshot.warning_status = 'none' 
            THEN 'pending'::warning_status_enum 
            ELSE warning_weekly_snapshot.warning_status 
        END,
        last_updated_at = now();

    -- Create warning letter if needed
    IF absence_count > 2 THEN
        INSERT INTO public.warning_letters (
            student_id, level_id, warning_type, week_start, status
        )
        SELECT 
            NEW.student_id,
            s.level_id,
            CASE 
                WHEN (SELECT COUNT(*) FROM public.warning_letters wl 
                      WHERE wl.student_id = NEW.student_id 
                      AND wl.entity_status = 'active') = 0 THEN 'first'
                WHEN (SELECT COUNT(*) FROM public.warning_letters wl 
                      WHERE wl.student_id = NEW.student_id 
                      AND wl.entity_status = 'active') = 1 THEN 'second'
                ELSE 'final'
            END,
            week_start_date,
            'pending'
        FROM public.students s
        WHERE s.id = NEW.student_id
        AND NOT EXISTS (
            SELECT 1 FROM public.warning_letters wl
            WHERE wl.student_id = NEW.student_id
            AND wl.week_start = week_start_date
            AND wl.entity_status = 'active'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update semester absences
CREATE OR REPLACE FUNCTION update_semester_absences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.semester_absences (student_id, semester_id, total_absences)
    SELECT 
        NEW.student_id,
        sem.id,
        (SELECT COUNT(*) 
         FROM public.attendance_records ar2
         JOIN public.services s2 ON s2.id = ar2.service_id
         WHERE ar2.student_id = NEW.student_id
         AND ar2.status = 'absent'
         AND s2.service_date BETWEEN sem.start_date AND sem.end_date
         AND ar2.entity_status = 'active'
         AND s2.entity_status = 'active')
    FROM public.semesters sem
    JOIN public.services s ON s.id = NEW.service_id
    WHERE s.service_date BETWEEN sem.start_date AND sem.end_date
    AND sem.entity_status = 'active'
    ON CONFLICT (student_id, semester_id)
    DO UPDATE SET 
        total_absences = EXCLUDED.total_absences,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to tables that need updated_at
CREATE TRIGGER trg_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to populate attendance records from batch versions
CREATE TRIGGER trg_populate_attendance_records
    AFTER INSERT ON public.attendance_batch_versions
    FOR EACH ROW WHEN (NEW.entity_status = 'active')
    EXECUTE FUNCTION populate_attendance_records();

-- Add trigger to update weekly snapshots when attendance records change
CREATE TRIGGER trg_update_weekly_snapshot
    AFTER INSERT ON public.attendance_records
    FOR EACH ROW WHEN (NEW.status = 'absent' AND NEW.entity_status = 'active')
    EXECUTE FUNCTION update_weekly_snapshot();

-- Add trigger to update semester absences
CREATE TRIGGER trg_update_semester_absences
    AFTER INSERT ON public.attendance_records
    FOR EACH ROW WHEN (NEW.status = 'absent' AND NEW.entity_status = 'active')
    EXECUTE FUNCTION update_semester_absences();

-- Soft delete triggers (instead of hard deletes)
CREATE TRIGGER trg_soft_delete_students
    BEFORE DELETE ON public.students
    FOR EACH ROW EXECUTE FUNCTION soft_delete_record();

CREATE TRIGGER trg_soft_delete_services
    BEFORE DELETE ON public.services
    FOR EACH ROW EXECUTE FUNCTION soft_delete_record();

CREATE TRIGGER trg_soft_delete_admins
    BEFORE DELETE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION soft_delete_record();

COMMENT ON FUNCTION update_updated_at_column() IS 'Updates the updated_at timestamp on record modification';
COMMENT ON FUNCTION soft_delete_record() IS 'Implements soft delete by setting entity_status to deleted';
COMMENT ON FUNCTION populate_attendance_records() IS 'Creates normalized attendance records from batch uploads';
COMMENT ON FUNCTION update_weekly_snapshot() IS 'Maintains weekly absence snapshots and creates warning letters';