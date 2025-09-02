// Generated TypeScript types from Zod schemas — export all inferred types
// PHASE 2: Replace src/services/authService.ts with Supabase wrapper - no other changes to callsites required.

import { z } from 'zod';

// Import all schemas
import {
  studentSchema,
  studentCreateSchema,
  studentUpdateSchema
} from '../validation/students.schema';

import {
  levelSchema,
  levelCreateSchema,
  levelUpdateSchema
} from '../validation/levels.schema';

import {
  serviceSchema,
  serviceCreateSchema,
  serviceUpdateSchema,
  serviceTypeEnum,
  serviceStatusEnum
} from '../validation/services.schema';

import {
  adminSchema,
  adminCreateSchema,
  adminUpdateSchema,
  roleEnum
} from '../validation/admins.schema';

import {
  semesterSchema,
  semesterCreateSchema,
  semesterUpdateSchema
} from '../validation/semesters.schema';

import {
  attendanceSummarySchema,
  attendanceSummaryCreateSchema,
  attendanceSummaryUpdateSchema
} from '../validation/attendance_summary.schema';

import {
  semesterAbsenceSchema,
  semesterAbsenceCreateSchema,
  semesterAbsenceUpdateSchema
} from '../validation/semester_absences.schema';

import {
  exeatSchema,
  exeatCreateSchema,
  exeatUpdateSchema
} from '../validation/exeats.schema';

import {
  warningLetterSchema,
  warningLetterCreateSchema,
  warningLetterUpdateSchema
} from '../validation/warning_letters.schema';

import {
  issueSchema,
  issueCreateSchema,
  issueUpdateSchema
} from '../validation/issues.schema';

import {
  manualOverrideSchema,
  manualOverrideCreateSchema,
  manualOverrideUpdateSchema,
  overrideReasonEnum
} from '../validation/manual_overrides.schema';

import {
  uploadHistorySchema,
  uploadHistoryCreateSchema,
  uploadHistoryUpdateSchema
} from '../validation/upload_history.schema';

import {
  adminActionSchema,
  adminActionCreateSchema,
  adminActionUpdateSchema
} from '../validation/admin_actions.schema';

import {
  serviceConstraintDefinitionSchema,
  serviceConstraintDefinitionCreateSchema,
  serviceConstraintDefinitionUpdateSchema
} from '../validation/service_constraint_definitions.schema';

import {
  overrideReasonDefinitionSchema,
  overrideReasonDefinitionCreateSchema,
  overrideReasonDefinitionUpdateSchema
} from '../validation/override_reason_definitions.schema';

import {
  specialServiceTemplateSchema,
  specialServiceTemplateCreateSchema,
  specialServiceTemplateUpdateSchema
} from '../validation/special_service_templates.schema';

import {
  vwStudentProfileAttendanceSchema
} from '../validation/vw_student_profile_attendance.schema';

// Export all inferred types
export type Student = z.infer<typeof studentSchema>;
export type StudentCreate = z.infer<typeof studentCreateSchema>;
export type StudentUpdate = z.infer<typeof studentUpdateSchema>;

export type Level = z.infer<typeof levelSchema>;
export type LevelCreate = z.infer<typeof levelCreateSchema>;
export type LevelUpdate = z.infer<typeof levelUpdateSchema>;

export type Service = z.infer<typeof serviceSchema>;
export type ServiceCreate = z.infer<typeof serviceCreateSchema>;
export type ServiceUpdate = z.infer<typeof serviceUpdateSchema>;
export type ServiceType = z.infer<typeof serviceTypeEnum>;
export type ServiceStatus = z.infer<typeof serviceStatusEnum>;

export type Admin = z.infer<typeof adminSchema>;
export type AdminCreate = z.infer<typeof adminCreateSchema>;
export type AdminUpdate = z.infer<typeof adminUpdateSchema>;
export type Role = z.infer<typeof roleEnum>;

export type Semester = z.infer<typeof semesterSchema>;
export type SemesterCreate = z.infer<typeof semesterCreateSchema>;
export type SemesterUpdate = z.infer<typeof semesterUpdateSchema>;

export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;
export type AttendanceSummaryCreate = z.infer<typeof attendanceSummaryCreateSchema>;
export type AttendanceSummaryUpdate = z.infer<typeof attendanceSummaryUpdateSchema>;

export type SemesterAbsence = z.infer<typeof semesterAbsenceSchema>;
export type SemesterAbsenceCreate = z.infer<typeof semesterAbsenceCreateSchema>;
export type SemesterAbsenceUpdate = z.infer<typeof semesterAbsenceUpdateSchema>;

export type Exeat = z.infer<typeof exeatSchema>;
export type ExeatCreate = z.infer<typeof exeatCreateSchema>;
export type ExeatUpdate = z.infer<typeof exeatUpdateSchema>;

export type WarningLetter = z.infer<typeof warningLetterSchema>;
export type WarningLetterCreate = z.infer<typeof warningLetterCreateSchema>;
export type WarningLetterUpdate = z.infer<typeof warningLetterUpdateSchema>;

export type Issue = z.infer<typeof issueSchema>;
export type IssueCreate = z.infer<typeof issueCreateSchema>;
export type IssueUpdate = z.infer<typeof issueUpdateSchema>;

export type ManualOverride = z.infer<typeof manualOverrideSchema>;
export type ManualOverrideCreate = z.infer<typeof manualOverrideCreateSchema>;
export type ManualOverrideUpdate = z.infer<typeof manualOverrideUpdateSchema>;
export type OverrideReason = z.infer<typeof overrideReasonEnum>;

export type UploadHistory = z.infer<typeof uploadHistorySchema>;
export type UploadHistoryCreate = z.infer<typeof uploadHistoryCreateSchema>;
export type UploadHistoryUpdate = z.infer<typeof uploadHistoryUpdateSchema>;

export type AdminAction = z.infer<typeof adminActionSchema>;
export type AdminActionCreate = z.infer<typeof adminActionCreateSchema>;
export type AdminActionUpdate = z.infer<typeof adminActionUpdateSchema>;

export type ServiceConstraintDefinition = z.infer<typeof serviceConstraintDefinitionSchema>;
export type ServiceConstraintDefinitionCreate = z.infer<typeof serviceConstraintDefinitionCreateSchema>;
export type ServiceConstraintDefinitionUpdate = z.infer<typeof serviceConstraintDefinitionUpdateSchema>;

export type OverrideReasonDefinition = z.infer<typeof overrideReasonDefinitionSchema>;
export type OverrideReasonDefinitionCreate = z.infer<typeof overrideReasonDefinitionCreateSchema>;
export type OverrideReasonDefinitionUpdate = z.infer<typeof overrideReasonDefinitionUpdateSchema>;

export type SpecialServiceTemplate = z.infer<typeof specialServiceTemplateSchema>;
export type SpecialServiceTemplateCreate = z.infer<typeof specialServiceTemplateCreateSchema>;
export type SpecialServiceTemplateUpdate = z.infer<typeof specialServiceTemplateUpdateSchema>;

// View types
export type VwStudentProfileAttendance = z.infer<typeof vwStudentProfileAttendanceSchema>;

// User type for auth context (simplified for Phase 1)
export type User = {
  id: string;
  email: string;
  matric_number?: string;
  name?: string;
};
