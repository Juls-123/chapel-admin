import { pgTable, unique, uuid, text, timestamp, index, foreignKey, check, date, jsonb, boolean, time, integer, pgView, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const devotionType = pgEnum("devotion_type", ['morning', 'evening'])
export const genderConstraint = pgEnum("gender_constraint", ['male', 'female', 'both'])
export const overrideReason = pgEnum("override_reason", ['late_exeat', 'scanning_error', 'manual_correction', 'permission', 'other'])
export const roleEnum = pgEnum("role_enum", ['admin', 'superadmin'])
export const serviceStatus = pgEnum("service_status", ['scheduled', 'active', 'completed', 'canceled', 'cancelled'])
export const serviceType = pgEnum("service_type", ['devotion', 'special', 'seminar'])
export const warningStatus = pgEnum("warning_status", ['none', 'pending', 'sent'])


export const levels = pgTable("levels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	name: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("levels_code_key").on(table.code),
]);

export const students = pgTable("students", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	matricNumber: text("matric_number").notNull(),
	firstName: text("first_name").notNull(),
	middleName: text("middle_name"),
	lastName: text("last_name").notNull(),
	email: text(),
	parentEmail: text("parent_email"),
	parentPhone: text("parent_phone"),
	levelId: uuid("level_id").notNull(),
	gender: text(),
	status: text().default('active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	fullName: text("full_name"),
	department: text(),
	uploadBatchId: uuid("upload_batch_id"),
}, (table) => [
	index("idx_students_level").using("btree", table.levelId.asc().nullsLast().op("uuid_ops")).where(sql`(status = 'active'::text)`),
	index("idx_students_matric").using("btree", table.matricNumber.asc().nullsLast().op("text_ops")).where(sql`(status = 'active'::text)`),
	index("idx_students_upload_batch_id").using("btree", table.uploadBatchId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [levels.id],
			name: "students_level_id_fkey"
		}),
	unique("students_matric_number_key").on(table.matricNumber),
	check("students_gender_check", sql`gender = ANY (ARRAY['male'::text, 'female'::text])`),
	check("students_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text])`),
]);

export const admins = pgTable("admins", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id"),
	firstName: text("first_name").notNull(),
	middleName: text("middle_name"),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	role: roleEnum().default('admin').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("admins_email_key").on(table.email),
]);

import { customType } from "drizzle-orm/pg-core";

const daterange = customType<{ data: string }>({
  dataType() {
    return "daterange";
  },
});

export const exeats = pgTable("exeats", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  studentId: uuid("student_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text(),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
  status: text().default('active'),
  period: daterange("period").generatedAlwaysAs(
    sql`daterange(start_date, (end_date + 1), '[)'::text)`
  ),
}, (table) => [
  index("idx_exeats_period_gist").using("gist", table.period.asc().nullsLast().op("range_ops"))
    .where(sql`(status = 'active'::text)`),
  foreignKey({
    columns: [table.createdBy],
    foreignColumns: [admins.id],
    name: "exeats_created_by_fkey"
  }),
  foreignKey({
    columns: [table.studentId],
    foreignColumns: [students.id],
    name: "exeats_student_id_fkey"
  }),
  check("exeats_status_check", sql`status = ANY (ARRAY['active'::text, 'ended'::text, 'cancelled'::text])`),
]);


export const manualOverrides = pgTable("manual_overrides", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	studentId: uuid("student_id"),
	serviceId: uuid("service_id"),
	levelId: uuid("level_id"),
	overriddenBy: uuid("overridden_by"),
	reason: overrideReason().notNull(),
	note: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [levels.id],
			name: "manual_overrides_level_id_fkey"
		}),
	foreignKey({
			columns: [table.overriddenBy],
			foreignColumns: [admins.id],
			name: "manual_overrides_overridden_by_fkey"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "manual_overrides_service_id_fkey"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "manual_overrides_student_id_fkey"
		}),
]);

export const adminActions = pgTable("admin_actions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminId: uuid("admin_id"),
	action: text().notNull(),
	objectType: text("object_type"),
	objectId: uuid("object_id"),
	objectLabel: text("object_label"),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_actions_recent").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [admins.id],
			name: "admin_actions_admin_id_fkey"
		}),
]);

export const overrideReasonDefinitions = pgTable("override_reason_definitions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	code: text().notNull(),
	displayName: text("display_name").notNull(),
	description: text(),
	requiresNote: boolean("requires_note").default(false),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [admins.id],
			name: "override_reason_definitions_created_by_fkey"
		}),
	unique("override_reason_definitions_code_key").on(table.code),
]);

export const services = pgTable("services", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	serviceDate: date("service_date").notNull(),
	status: serviceStatus().default('scheduled').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	lockedAfterIngestion: boolean("locked_after_ingestion").default(false),
	serviceType: serviceType("service_type").notNull(),
	devotionType: devotionType("devotion_type"),
	genderConstraint: genderConstraint("gender_constraint").default('both'),
	serviceTime: time("service_time").notNull(),
}, (table) => [
	index("idx_services_date_status").using("btree", table.serviceDate.asc().nullsLast().op("date_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("idx_services_date_time").using("btree", table.serviceDate.asc().nullsLast().op("time_ops"), table.serviceTime.asc().nullsLast().op("date_ops")),
	index("idx_services_devotion_type").using("btree", table.devotionType.asc().nullsLast().op("enum_ops")),
	index("idx_services_gender_constraint").using("btree", table.genderConstraint.asc().nullsLast().op("enum_ops")),
	index("idx_services_service_date").using("btree", table.serviceDate.asc().nullsLast().op("date_ops")),
	index("idx_services_service_type").using("btree", table.serviceType.asc().nullsLast().op("enum_ops")),
	index("idx_services_time").using("btree", table.serviceTime.asc().nullsLast().op("time_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [admins.id],
			name: "services_created_by_fkey"
		}),
]);

export const studentUploads = pgTable("student_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileHash: text("file_hash").notNull(),
	storagePath: text("storage_path").notNull(),
	uploadedBy: uuid("uploaded_by").notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_student_uploads_file_hash").using("btree", table.fileHash.asc().nullsLast().op("text_ops")),
	index("idx_student_uploads_uploaded_at").using("btree", table.uploadedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_student_uploads_uploaded_by").using("btree", table.uploadedBy.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [admins.id],
			name: "student_uploads_uploaded_by_fkey"
		}),
]);

export const semesters = pgTable("semesters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const serviceLevels = pgTable("service_levels", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceId: uuid("service_id").notNull(),
	levelId: uuid("level_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_service_levels_level_id").using("btree", table.levelId.asc().nullsLast().op("uuid_ops")),
	index("idx_service_levels_service_id").using("btree", table.serviceId.asc().nullsLast().op("uuid_ops")),
	index("idx_service_levels_service_level").using("btree", table.serviceId.asc().nullsLast().op("uuid_ops"), table.levelId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [levels.id],
			name: "service_levels_level_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "service_levels_service_id_fkey"
		}).onDelete("cascade"),
	unique("service_levels_unique").on(table.serviceId, table.levelId),
]);

export const attendanceBatches = pgTable("attendance_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	attendanceUploadId: uuid("attendance_upload_id").notNull(),
	versionNumber: integer("version_number").default(1).notNull(),
	rawPath: text("raw_path").notNull(),
	attendeesPath: text("attendees_path").notNull(),
	absenteesPath: text("absentees_path").notNull(),
	issuesPath: text("issues_path").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	exemptedPath: text("exempted_path"),
}, (table) => [
	index("idx_attendance_batches_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_attendance_batches_upload_id").using("btree", table.attendanceUploadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.attendanceUploadId],
			foreignColumns: [attendanceUploads.id],
			name: "attendance_batches_attendance_upload_id_fkey"
		}),
]);

export const studentUploadErrors = pgTable("student_upload_errors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	studentUploadId: uuid("student_upload_id").notNull(),
	rowNumber: integer("row_number").notNull(),
	errorType: text("error_type").notNull(),
	errorMessage: text("error_message").notNull(),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_student_upload_errors_error_type").using("btree", table.errorType.asc().nullsLast().op("text_ops")),
	index("idx_student_upload_errors_upload_id").using("btree", table.studentUploadId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.studentUploadId],
			foreignColumns: [studentUploads.id],
			name: "student_upload_errors_student_upload_id_fkey"
		}),
]);

export const attendanceUploads = pgTable("attendance_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fileHash: text("file_hash").notNull(),
	serviceId: uuid("service_id").notNull(),
	levelId: uuid("level_id").notNull(),
	storagePath: text("storage_path").notNull(),
	uploadedBy: uuid("uploaded_by").notNull(),
	uploadedAt: timestamp("uploaded_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_attendance_uploads_file_hash").using("btree", table.fileHash.asc().nullsLast().op("text_ops")),
	index("idx_attendance_uploads_service_level").using("btree", table.serviceId.asc().nullsLast().op("uuid_ops"), table.levelId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_uploads_uploaded_at").using("btree", table.uploadedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.levelId],
			foreignColumns: [levels.id],
			name: "attendance_uploads_level_id_fkey"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "attendance_uploads_service_id_fkey"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [admins.id],
			name: "attendance_uploads_uploaded_by_fkey"
		}),
]);

export const attendanceIssues = pgTable("attendance_issues", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	attendanceBatchId: uuid("attendance_batch_id").notNull(),
	studentId: uuid("student_id"),
	issueType: text("issue_type").notNull(),
	issueDescription: text("issue_description").notNull(),
	rawData: jsonb("raw_data"),
	resolved: boolean().default(false),
	resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }),
	resolvedBy: uuid("resolved_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_attendance_issues_batch_id").using("btree", table.attendanceBatchId.asc().nullsLast().op("uuid_ops")),
	index("idx_attendance_issues_issue_type").using("btree", table.issueType.asc().nullsLast().op("text_ops")),
	index("idx_attendance_issues_resolved").using("btree", table.resolved.asc().nullsLast().op("bool_ops")),
	index("idx_attendance_issues_student_id").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.attendanceBatchId],
			foreignColumns: [attendanceBatches.id],
			name: "attendance_issues_attendance_batch_id_fkey"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [admins.id],
			name: "attendance_issues_resolved_by_fkey"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "attendance_issues_student_id_fkey"
		}),
]);
export const vwServicesWithLevels = pgView("vw_services_with_levels", {	id: uuid(),
	name: text(),
	serviceDate: date("service_date"),
	status: serviceStatus(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	lockedAfterIngestion: boolean("locked_after_ingestion"),
	serviceType: serviceType("service_type"),
	devotionType: devotionType("devotion_type"),
	genderConstraint: genderConstraint("gender_constraint"),
	serviceTime: time("service_time"),
	levelCodes: text("level_codes"),
	levelNames: text("level_names"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	levelCount: bigint("level_count", { mode: "number" }),
}).as(sql`SELECT s.id, s.name, s.service_date, s.status, s.created_by, s.created_at, s.locked_after_ingestion, s.service_type, s.devotion_type, s.gender_constraint, s.service_time, array_agg(l.code ORDER BY l.code) AS level_codes, array_agg(l.name ORDER BY l.code) AS level_names, count(sl.level_id) AS level_count FROM services s LEFT JOIN service_levels sl ON s.id = sl.service_id LEFT JOIN levels l ON sl.level_id = l.id GROUP BY s.id, s.name, s.service_date, s.service_time, s.service_type, s.devotion_type, s.gender_constraint, s.status, s.created_at`);

export const vwServiceLevelDetails = pgView("vw_service_level_details", {	serviceId: uuid("service_id"),
	serviceName: text("service_name"),
	serviceDate: date("service_date"),
	serviceTime: time("service_time"),
	serviceType: serviceType("service_type"),
	levelId: uuid("level_id"),
	levelCode: text("level_code"),
	levelName: text("level_name"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }),
}).as(sql`SELECT s.id AS service_id, s.name AS service_name, s.service_date, s.service_time, s.service_type, l.id AS level_id, l.code AS level_code, l.name AS level_name, sl.created_at AS assigned_at FROM services s JOIN service_levels sl ON s.id = sl.service_id JOIN levels l ON sl.level_id = l.id ORDER BY s.service_date DESC, s.service_time, l.code`);

export const vwServicesWithDatetime = pgView("vw_services_with_datetime", {	id: uuid(),
	name: text(),
	serviceDate: date("service_date"),
	status: serviceStatus(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	lockedAfterIngestion: boolean("locked_after_ingestion"),
	serviceType: serviceType("service_type"),
	devotionType: devotionType("devotion_type"),
	genderConstraint: genderConstraint("gender_constraint"),
	serviceTime: time("service_time"),
	serviceDatetime: timestamp("service_datetime", { mode: 'string' }),
}).as(sql`SELECT id, name, service_date, status, created_by, created_at, locked_after_ingestion, service_type, devotion_type, gender_constraint, service_time, service_date + service_time AS service_datetime FROM services`);

export const vwRecentAdminActions = pgView("vw_recent_admin_actions", {	id: uuid(),
	action: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	objectType: text("object_type"),
	objectLabel: text("object_label"),
	adminName: text("admin_name"),
}).as(sql`SELECT aa.id, aa.action, aa.created_at, aa.object_type, aa.object_label, concat(a.first_name, ' ', a.last_name) AS admin_name FROM admin_actions aa JOIN admins a ON aa.admin_id = a.id ORDER BY aa.created_at DESC LIMIT 50`);
export const warningLetterWorkflows = pgTable("warning_letter_workflows", {
	workflowId: uuid("workflow_id").defaultRandom().primaryKey().notNull(),
	
	// Workflow metadata
	mode: text().notNull().$type<'single' | 'batch' | 'weekly'>(),
	status: text().notNull().$type<'draft' | 'locked' | 'completed' | 'failed'>(),
	
	// Date range
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	workflowDate: date("workflow_date").notNull(), // For folder structure (YYYY/MM/DD)
	
	// Counts for quick stats
	totalServices: integer("total_services").default(0).notNull(),
	totalStudents: integer("total_students").default(0).notNull(),
	warningsGenerated: integer("warnings_generated").default(0).notNull(),
	warningsSent: integer("warnings_sent").default(0).notNull(),
	warningsExported: integer("warnings_exported").default(0).notNull(),
	
	// Storage reference (Pascal case path)
	storagePath: text("storage_path").notNull(),
	// Example: "2025/10/15/Weekly/abc-123-uuid"
	
	// Admin tracking
	initiatedBy: uuid("initiated_by").notNull().references(() => admins.id),
	
	// Timestamps
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	
	// Error tracking (minimal)
	errorMessage: text("error_message"),
  }, (table) => [
	index("idx_warning_workflows_mode").using("btree", table.mode.asc().nullsLast().op("text_ops")),
	index("idx_warning_workflows_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_warning_workflows_date_range").using("btree", 
	  table.startDate.asc().nullsLast().op("date_ops"), 
	  table.endDate.asc().nullsLast().op("date_ops")
	),
	index("idx_warning_workflows_workflow_date").using("btree", 
	  table.workflowDate.desc().nullsFirst().op("date_ops")
	),
	index("idx_warning_workflows_created_at").using("btree", 
	  table.createdAt.desc().nullsFirst().op("timestamptz_ops")
	),
	index("idx_warning_workflows_initiated_by").using("btree", 
	  table.initiatedBy.asc().nullsLast().op("uuid_ops")
	),
	check("warning_workflows_mode_check", 
	  sql`mode IN ('single', 'batch', 'weekly')`
	),
	check("warning_workflows_status_check", 
	  sql`status IN ('draft', 'locked', 'completed', 'failed')`
	),
  ]);