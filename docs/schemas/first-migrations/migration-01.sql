-- Migration 001: Create ENUMs and Types
-- Run Date: [YYYY-MM-DD]
-- Description: Creates all required ENUM types for the chapel attendance system

-- Create ENUM types
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE student_status_enum AS ENUM ('active', 'paused', 'deleted');
CREATE TYPE level_enum AS ENUM ('100', '200', '300', '400', '500');
CREATE TYPE service_type_enum AS ENUM ('morning', 'evening', 'special');
CREATE TYPE service_status_enum AS ENUM ('scheduled', 'active', 'completed', 'canceled');
CREATE TYPE role_enum AS ENUM ('admin', 'superadmin');
CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'exempted');
CREATE TYPE warning_status_enum AS ENUM ('none', 'pending', 'sent');
CREATE TYPE upload_status_enum AS ENUM ('processing', 'completed', 'failed', 'partial');
CREATE TYPE exeat_status_enum AS ENUM ('active', 'ended', 'canceled');
CREATE TYPE override_reason_enum AS ENUM ('scanning_error', 'medical', 'technical_issue', 'other');

-- Create composite types for complex data
CREATE TYPE file_type_enum AS ENUM ('students', 'attendance');
CREATE TYPE entity_status_enum AS ENUM ('active', 'deleted');

COMMENT ON TYPE gender_enum IS 'Student gender options';
COMMENT ON TYPE level_enum IS 'Academic levels (100-500)';
COMMENT ON TYPE service_type_enum IS 'Types of chapel services';
COMMENT ON TYPE service_status_enum IS 'Service lifecycle status';
COMMENT ON TYPE attendance_status_enum IS 'Student attendance status for services';
COMMENT ON TYPE warning_status_enum IS 'Warning letter status progression';