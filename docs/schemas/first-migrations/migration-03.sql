-- Migration 003: Modify Existing Tables
-- Run Date: [YYYY-MM-DD]
-- Description: Updates existing tables to match domain map specifications

-- Update students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Convert gender to enum (requires careful handling of existing data)
DO $$
BEGIN
    -- First, update any invalid gender values to NULL or a default
    UPDATE public.students 
    SET gender = CASE 
        WHEN gender NOT IN ('male', 'female') THEN 'male'  -- or NULL, depending on your preference
        ELSE gender 
    END
    WHERE gender IS NOT NULL;
    
    -- Add new gender_enum column
    ALTER TABLE public.students ADD COLUMN gender_new gender_enum;
    
    -- Copy data to new column
    UPDATE public.students 
    SET gender_new = gender::gender_enum 
    WHERE gender IS NOT NULL;
    
    -- Drop old column and rename new one
    ALTER TABLE public.students DROP COLUMN gender;
    ALTER TABLE public.students RENAME COLUMN gender_new TO gender;
END $$;

-- Update status column to use enum
ALTER TABLE public.students 
ALTER COLUMN status TYPE student_status_enum USING status::student_status_enum;

-- Update admins table
ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Convert role to enum
ALTER TABLE public.admins 
ALTER COLUMN role TYPE role_enum USING role::role_enum;

-- Update services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS service_datetime timestamp with time zone,
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Combine service_date and potentially service_time into service_datetime
-- If you have separate time data, adjust this accordingly
UPDATE public.services 
SET service_datetime = service_date::timestamp with time zone
WHERE service_datetime IS NULL;

-- Convert service type and status to enums
ALTER TABLE public.services 
ALTER COLUMN type TYPE service_type_enum USING type::service_type_enum,
ALTER COLUMN status TYPE service_status_enum USING status::service_status_enum;

-- Update exeats table
ALTER TABLE public.exeats 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Convert status to enum
ALTER TABLE public.exeats 
ALTER COLUMN status TYPE exeat_status_enum USING status::exeat_status_enum;

-- Update upload_history table
ALTER TABLE public.upload_history 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Convert upload_status to enum
ALTER TABLE public.upload_history 
ALTER COLUMN upload_status TYPE upload_status_enum USING upload_status::upload_status_enum;

-- Convert entity_type to file_type_enum (rename and convert)
ALTER TABLE public.upload_history 
ADD COLUMN file_type_new file_type_enum;

UPDATE public.upload_history 
SET file_type_new = CASE 
    WHEN entity_type = 'student' OR entity_type = 'students' THEN 'students'::file_type_enum
    WHEN entity_type = 'attendance' THEN 'attendance'::file_type_enum
    ELSE 'students'::file_type_enum  -- default fallback
END;

ALTER TABLE public.upload_history DROP COLUMN entity_type;
ALTER TABLE public.upload_history RENAME COLUMN file_type_new TO file_type;

-- Add soft delete and audit columns to other tables
ALTER TABLE public.levels 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.semesters 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.attendance_batch_versions 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.attendance_summary 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.manual_overrides 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.scan_archives 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.service_levels 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

ALTER TABLE public.admin_actions 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add missing columns to warning_weekly_snapshot
ALTER TABLE public.warning_weekly_snapshot 
ADD COLUMN IF NOT EXISTS entity_status entity_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Convert warning_status to enum
ALTER TABLE public.warning_weekly_snapshot 
ALTER COLUMN warning_status TYPE warning_status_enum USING warning_status::warning_status_enum;

-- Add comments for clarity
COMMENT ON COLUMN public.students.entity_status IS 'Soft delete status for auditing';
COMMENT ON COLUMN public.services.service_datetime IS 'Combined date and time for service';
COMMENT ON COLUMN public.upload_history.file_type IS 'Type of file uploaded (students or attendance)';