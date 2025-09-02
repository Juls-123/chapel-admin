// Generated from /docs/schemas — barrel export for all validation schemas
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

// Core entity schemas
export * from './students.schema';
export * from './levels.schema';
export * from './services.schema';
export * from './admins.schema';
export * from './semesters.schema';

// Attendance and tracking schemas
export * from './attendance_summary.schema';
export * from './semester_absences.schema';
export * from './exeats.schema';
export * from './warning_letters.schema';

// System and audit schemas
export * from './issues.schema';
export * from './manual_overrides.schema';
export * from './upload_history.schema';
export * from './admin_actions.schema';

// Configuration schemas
export * from './service_constraint_definitions.schema';
export * from './override_reason_definitions.schema';
export * from './special_service_templates.schema';

// View schemas
export * from './vw_student_profile_attendance.schema';
