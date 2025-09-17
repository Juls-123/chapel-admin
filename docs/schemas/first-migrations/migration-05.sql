-- Migration 005: Create Views
-- Run Date: [YYYY-MM-DD]
-- Description: Creates database views for efficient querying as specified in domain map

-- View: Student Profile (Student Domain)
CREATE OR REPLACE VIEW vw_student_profile AS
SELECT 
    s.id,
    s.matric_number,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.full_name,
    s.gender,
    s.level,
    s.email,
    s.parent_email,
    s.parent_phone,
    s.status,
    s.created_at,
    -- Attendance summary
    COALESCE(att.total_services, 0) as total_services,
    COALESCE(att.present_count, 0) as present_count,
    COALESCE(att.absent_count, 0) as absent_count,
    COALESCE(att.exempted_count, 0) as exempted_count,
    -- Current exeat status
    CASE WHEN e.id IS NOT NULL THEN true ELSE false END as on_exeat,
    e.end_date as exeat_end_date,
    -- Warning status
    COALESCE(w.warning_count, 0) as total_warnings
FROM public.students s
LEFT JOIN (
    SELECT 
        ar.student_id,
        COUNT(*) as total_services,
        COUNT(*) FILTER (WHERE ar.status = 'present') as present_count,
        COUNT(*) FILTER (WHERE ar.status = 'absent') as absent_count,
        COUNT(*) FILTER (WHERE ar.status = 'exempted') as exempted_count
    FROM public.attendance_records ar
    WHERE ar.entity_status = 'active'
    GROUP BY ar.student_id
) att ON s.id = att.student_id
LEFT JOIN public.exeats e ON s.id = e.student_id 
    AND e.status = 'active' 
    AND e.entity_status = 'active' 
    AND current_date BETWEEN e.start_date AND e.end_date
LEFT JOIN (
    SELECT 
        wl.student_id,
        COUNT(*) as warning_count
    FROM public.warning_letters wl
    WHERE wl.entity_status = 'active'
    GROUP BY wl.student_id
) w ON s.id = w.student_id
WHERE s.entity_status = 'active' AND s.status != 'deleted';

-- View: Today's Services (Service Domain)
CREATE OR REPLACE VIEW vw_today_services AS
SELECT 
    s.id,
    s.type,
    s.name,
    s.service_datetime,
    s.status,
    s.locked_after_ingestion as locked,
    COALESCE(att.total_attendees, 0) as total_attendees,
    COALESCE(att.total_present, 0) as total_present,
    COALESCE(att.total_absent, 0) as total_absent,
    COALESCE(att.total_exempted, 0) as total_exempted
FROM public.services s
LEFT JOIN (
    SELECT 
        assum.service_id,
        SUM(assum.total_students) as total_attendees,
        SUM(assum.total_present) as total_present,
        SUM(assum.total_absent) as total_absent,
        SUM(assum.total_exempted) as total_exempted
    FROM public.attendance_summary assum
    WHERE assum.entity_status = 'active'
    GROUP BY assum.service_id
) att ON s.id = att.service_id
WHERE s.entity_status = 'active' 
AND s.service_datetime::date = current_date;

-- View: Daily Attendance Totals (Attendance Domain)
CREATE OR REPLACE VIEW vw_daily_attendance_totals AS
SELECT 
    s.service_datetime::date as service_date,
    s.type as service_type,
    SUM(assum.total_students) as total_students,
    SUM(assum.total_present) as total_present,
    SUM(assum.total_absent) as total_absent,
    SUM(assum.total_exempted) as total_exempted,
    SUM(assum.total_unmatched) as total_unmatched
FROM public.services s
JOIN public.attendance_summary assum ON s.id = assum.service_id
WHERE s.entity_status = 'active' 
AND s.status = 'completed'
AND assum.entity_status = 'active'
GROUP BY s.service_datetime::date, s.type
ORDER BY service_date DESC, service_type;

-- View: Monthly Top Absentees (Attendance Domain)
CREATE OR REPLACE VIEW vw_monthly_top_absentees AS
SELECT 
    s.id as student_id,
    s.matric_number,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.full_name,
    s.level,
    COUNT(*) as absence_count
FROM public.students s
JOIN public.attendance_records ar ON s.id = ar.student_id
JOIN public.services sv ON ar.service_id = sv.id
WHERE ar.status = 'absent'
AND ar.entity_status = 'active'
AND sv.entity_status = 'active'
AND sv.service_datetime >= date_trunc('month', current_date)
AND sv.service_datetime < date_trunc('month', current_date) + interval '1 month'
AND s.entity_status = 'active'
GROUP BY s.id, s.matric_number, s.first_name, s.middle_name, s.last_name, s.full_name, s.level
ORDER BY absence_count DESC
LIMIT 5;

-- View: Pending Warnings (Discipline Domain)
CREATE OR REPLACE VIEW vw_pending_warnings AS
SELECT 
    wl.id,
    s.id as student_id,
    s.matric_number,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.full_name,
    s.level,
    s.email,
    s.parent_email,
    wl.warning_type,
    wl.week_start,
    wl.issued_at,
    wl.notes,
    wws.absences as weekly_absences
FROM public.warning_letters wl
JOIN public.students s ON wl.student_id = s.id
LEFT JOIN public.warning_weekly_snapshot wws ON wl.student_id = wws.student_id 
    AND wl.week_start = wws.week_start
    AND wws.entity_status = 'active'
WHERE wl.status = 'pending'
AND wl.entity_status = 'active'
AND s.entity_status = 'active'
ORDER BY wl.issued_at DESC;

-- View: Exeats Ending Today (Discipline Domain)  
CREATE OR REPLACE VIEW vw_exeats_ending_today AS
SELECT 
    e.id,
    s.id as student_id,
    s.matric_number,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.full_name,
    s.level,
    e.start_date,
    e.end_date,
    e.reason,
    e.created_at
FROM public.exeats e
JOIN public.students s ON e.student_id = s.id
WHERE e.end_date = current_date
AND e.status = 'active'
AND e.entity_status = 'active'
AND s.entity_status = 'active'
ORDER BY s.full_name;

-- View: Semester Absences (Discipline Domain)
CREATE OR REPLACE VIEW vw_semester_absences AS
SELECT 
    sa.id,
    s.id as student_id,
    s.matric_number,
    s.first_name,
    s.middle_name, 
    s.last_name,
    s.full_name,
    s.level,
    sem.name as semester_name,
    sem.start_date,
    sem.end_date,
    sa.total_absences,
    sa.updated_at
FROM public.semester_absences sa
JOIN public.students s ON sa.student_id = s.id
JOIN public.semesters sem ON sa.semester_id = sem.id
WHERE sa.entity_status = 'active'
AND s.entity_status = 'active'
AND sem.entity_status = 'active'
ORDER BY sem.start_date DESC, sa.total_absences DESC;

-- View: Recent Admin Actions (Admin/System Domain)
CREATE OR REPLACE VIEW vw_recent_admin_actions AS
SELECT 
    aa.id,
    a.first_name || ' ' || a.last_name as admin_name,
    aa.action,
    aa.object_type,
    aa.object_id,
    aa.object_label,
    aa.details,
    aa.created_at,
    -- Try to get recipient/target information based on object_type
    CASE 
        WHEN aa.object_type = 'student' THEN (
            SELECT s.first_name || ' ' || s.last_name 
            FROM public.students s 
            WHERE s.id = aa.object_id AND s.entity_status = 'active'
        )
        WHEN aa.object_type = 'service' THEN (
            SELECT COALESCE(srv.name, srv.type::text || ' Service')
            FROM public.services srv
            WHERE srv.id = aa.object_id AND srv.entity_status = 'active'
        )
        WHEN aa.object_type = 'exeat' THEN (
            SELECT s.first_name || ' ' || s.last_name || ' (Exeat)'
            FROM public.exeats e
            JOIN public.students s ON e.student_id = s.id
            WHERE e.id = aa.object_id AND e.entity_status = 'active' AND s.entity_status = 'active'
        )
        ELSE aa.object_label
    END as target_description
FROM public.admin_actions aa
JOIN public.admins a ON aa.admin_id = a.id
WHERE aa.entity_status = 'active'
AND a.entity_status = 'active'
ORDER BY aa.created_at DESC
LIMIT 50;

-- Create indexes for the views (on underlying tables)
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_status ON public.attendance_records(student_id, status) WHERE entity_status = 'active';
CREATE INDEX IF NOT EXISTS idx_services_date_status ON public.services(service_datetime::date, status) WHERE entity_status = 'active';
CREATE INDEX IF NOT EXISTS idx_services_today ON public.services(service_datetime) WHERE entity_status = 'active' AND service_datetime::date = current_date;
CREATE INDEX IF NOT EXISTS idx_warning_letters_status_date ON public.warning_letters(status, issued_at DESC) WHERE entity_status = 'active';
CREATE INDEX IF NOT EXISTS idx_exeats_end_date ON public.exeats(end_date) WHERE entity_status = 'active' AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_admin_actions_recent ON public.admin_actions(created_at DESC) WHERE entity_status = 'active';

-- Add comments to views
COMMENT ON VIEW vw_student_profile IS 'Complete student profile with attendance and disciplinary summary';
COMMENT ON VIEW vw_today_services IS 'Services scheduled for today with attendance counts';
COMMENT ON VIEW vw_daily_attendance_totals IS 'Daily attendance statistics for completed services';
COMMENT ON VIEW vw_monthly_top_absentees IS 'Top 5 students with most absences this month';
COMMENT ON VIEW vw_pending_warnings IS 'Warning letters pending to be sent';
COMMENT ON VIEW vw_exeats_ending_today IS 'Student exeats that end today';
COMMENT ON VIEW vw_semester_absences IS 'Total absences per student per semester';
COMMENT ON VIEW vw_recent_admin_actions IS 'Recent administrative actions with admin and target details';