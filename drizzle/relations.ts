import { relations } from "drizzle-orm/relations";
import { levels, students, admins, exeats, manualOverrides, services, adminActions, overrideReasonDefinitions, studentUploads, serviceLevels, attendanceUploads, attendanceBatches, studentUploadErrors, attendanceIssues, warningLetterWorkflows } from "./schema";

export const studentsRelations = relations(students, ({one, many}) => ({
	level: one(levels, {
		fields: [students.levelId],
		references: [levels.id]
	}),
	exeats: many(exeats),
	manualOverrides: many(manualOverrides),
	attendanceIssues: many(attendanceIssues),
}));

export const levelsRelations = relations(levels, ({many}) => ({
	students: many(students),
	manualOverrides: many(manualOverrides),
	serviceLevels: many(serviceLevels),
	attendanceUploads: many(attendanceUploads),
}));

export const exeatsRelations = relations(exeats, ({one}) => ({
	admin: one(admins, {
		fields: [exeats.createdBy],
		references: [admins.id]
	}),
	student: one(students, {
		fields: [exeats.studentId],
		references: [students.id]
	}),
}));

export const adminsRelations = relations(admins, ({many}) => ({
	exeats: many(exeats),
	manualOverrides: many(manualOverrides),
	adminActions: many(adminActions),
	overrideReasonDefinitions: many(overrideReasonDefinitions),
	services: many(services),
	studentUploads: many(studentUploads),
	attendanceUploads: many(attendanceUploads),
	attendanceIssues: many(attendanceIssues),
	warningLetterWorkflows: many(warningLetterWorkflows),
}));

export const manualOverridesRelations = relations(manualOverrides, ({one}) => ({
	level: one(levels, {
		fields: [manualOverrides.levelId],
		references: [levels.id]
	}),
	admin: one(admins, {
		fields: [manualOverrides.overriddenBy],
		references: [admins.id]
	}),
	service: one(services, {
		fields: [manualOverrides.serviceId],
		references: [services.id]
	}),
	student: one(students, {
		fields: [manualOverrides.studentId],
		references: [students.id]
	}),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	manualOverrides: many(manualOverrides),
	admin: one(admins, {
		fields: [services.createdBy],
		references: [admins.id]
	}),
	serviceLevels: many(serviceLevels),
	attendanceUploads: many(attendanceUploads),
}));

export const adminActionsRelations = relations(adminActions, ({one}) => ({
	admin: one(admins, {
		fields: [adminActions.adminId],
		references: [admins.id]
	}),
}));

export const overrideReasonDefinitionsRelations = relations(overrideReasonDefinitions, ({one}) => ({
	admin: one(admins, {
		fields: [overrideReasonDefinitions.createdBy],
		references: [admins.id]
	}),
}));

export const studentUploadsRelations = relations(studentUploads, ({one, many}) => ({
	admin: one(admins, {
		fields: [studentUploads.uploadedBy],
		references: [admins.id]
	}),
	studentUploadErrors: many(studentUploadErrors),
}));

export const serviceLevelsRelations = relations(serviceLevels, ({one}) => ({
	level: one(levels, {
		fields: [serviceLevels.levelId],
		references: [levels.id]
	}),
	service: one(services, {
		fields: [serviceLevels.serviceId],
		references: [services.id]
	}),
}));

export const attendanceBatchesRelations = relations(attendanceBatches, ({one, many}) => ({
	attendanceUpload: one(attendanceUploads, {
		fields: [attendanceBatches.attendanceUploadId],
		references: [attendanceUploads.id]
	}),
	attendanceIssues: many(attendanceIssues),
}));

export const attendanceUploadsRelations = relations(attendanceUploads, ({one, many}) => ({
	attendanceBatches: many(attendanceBatches),
	level: one(levels, {
		fields: [attendanceUploads.levelId],
		references: [levels.id]
	}),
	service: one(services, {
		fields: [attendanceUploads.serviceId],
		references: [services.id]
	}),
	admin: one(admins, {
		fields: [attendanceUploads.uploadedBy],
		references: [admins.id]
	}),
}));

export const studentUploadErrorsRelations = relations(studentUploadErrors, ({one}) => ({
	studentUpload: one(studentUploads, {
		fields: [studentUploadErrors.studentUploadId],
		references: [studentUploads.id]
	}),
}));

export const attendanceIssuesRelations = relations(attendanceIssues, ({one}) => ({
	attendanceBatch: one(attendanceBatches, {
		fields: [attendanceIssues.attendanceBatchId],
		references: [attendanceBatches.id]
	}),
	admin: one(admins, {
		fields: [attendanceIssues.resolvedBy],
		references: [admins.id]
	}),
	student: one(students, {
		fields: [attendanceIssues.studentId],
		references: [students.id]
	}),
}));
// Relations
export const warningLetterWorkflowsRelations = relations(warningLetterWorkflows, ({one}) => ({
	admin: one(admins, {
	  fields: [warningLetterWorkflows.initiatedBy],
	  references: [admins.id]
	}),
  }));