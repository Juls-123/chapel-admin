-- Migration 002: Create Missing Tables
-- Run Date: [YYYY-MM-DD]
-- Description: Creates tables that exist in domain map but not in current schema

-- Create attendance_records table (normalized attendance tracking)
CREATE TABLE public.attendance_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    service_id uuid NOT NULL,
    status attendance_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    entity_status entity_status_enum DEFAULT 'active',
    CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT attendance_records_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
    CONSTRAINT attendance_records_unique UNIQUE(student_id, service_id)
);

-- Create warning_letters table (missing from current schema)
CREATE TABLE public.warning_letters (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    level_id uuid NOT NULL,
    warning_type text NOT NULL CHECK (warning_type = ANY (ARRAY['first'::text, 'second'::text, 'final'::text])),
    week_start date NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'canceled')),
    issued_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    sent_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    entity_status entity_status_enum DEFAULT 'active',
    CONSTRAINT warning_letters_pkey PRIMARY KEY (id),
    CONSTRAINT warning_letters_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT warning_letters_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id),
    CONSTRAINT warning_letters_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.admins(id),
    CONSTRAINT warning_letters_unique UNIQUE(student_id, week_start, warning_type)
);

-- Create current_attendance_batch table (missing composite key constraint)
-- Note: This table exists but may need the composite key
-- First check if the constraint exists, if not add it in migration 003

-- Add any missing indexes for new tables
CREATE INDEX idx_attendance_records_student_service ON public.attendance_records(student_id, service_id) WHERE entity_status = 'active';
CREATE INDEX idx_attendance_records_service_status ON public.attendance_records(service_id, status) WHERE entity_status = 'active';
CREATE INDEX idx_warning_letters_student_week ON public.warning_letters(student_id, week_start) WHERE entity_status = 'active';
CREATE INDEX idx_warning_letters_pending ON public.warning_letters(status, created_at DESC) WHERE status = 'pending' AND entity_status = 'active';

COMMENT ON TABLE public.attendance_records IS 'Normalized attendance records for efficient querying';
COMMENT ON TABLE public.warning_letters IS 'Warning letters with escalation levels and tracking';