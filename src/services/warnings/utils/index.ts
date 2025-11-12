// src/lib/utils/warning-letters/index.ts

import { BatchParserError } from './batch-parser';
import { DateCollectorError } from './date-collector';
import { EmailError } from './emailer-utility';
import { ExportError } from './export-utility';
import { WarningStorageError } from './storage-utility';
import { StudentListError } from './student-list-generator';
import { WeekDeriverError } from './week-deriver';
import { WorkflowMetaError } from './workflow-meta-manager';

/**
 * Warning Letters Module - Utility Functions
 * 
 * This module provides all the utilities needed for the warning letters workflow:
 * - Week derivation and date range calculations
 * - Storage operations in dedicated 'warnings' bucket
 * - Database tracking and audit trail
 * - Admin action logging
 * - Date collection and attendance data aggregation
 * - Student list generation and contact management
 * - Export functionality (CSV, PDF)
 * - Email sending capabilities
 * - Batch mode parsing and validation
 * - Integrated workflow management
 */

// Week Deriver
export {
  deriveWeekRange,
  generateWeekId,
  getMondayOfWeek,
  getSundayOfWeek,
  getDatesInWeek,
  isDateInWeek,
  weeksOverlap,
  validateWeekNotProcessed,
  getWeekNumber,
  formatDate,
  type WeekRange,
  type WeekProcessingRecord,
  WeekDeriverError,
} from './week-deriver';

// Storage Utility (Warnings Bucket - Pascal Case Paths)
export {
  generateStoragePath,
  generateWarningListPath,
  generateMetaReportPath,
  generateEmailReportPath,
  saveWarningList,
  loadWarningList,
  saveMetaReport,
  loadMetaReport,
  saveEmailDeliveryReport,
  loadEmailDeliveryReport,
  updateWarningStatus,
  bulkUpdateWarningStatuses,
  workflowFilesExist,
  type ServiceInfo,
  type WarningRecord,
  type WarningListJSON,
  type MetaReportJSON,
  type EmailDeliveryReportJSON,
  WarningStorageError,
} from './storage-utility';

// Database Utility
export {
  insertWorkflowToDB,
  updateWorkflowInDB,
  getWorkflowFromDB,
  listWorkflowsFromDB,
  isWeekProcessedInDB,
  deleteWorkflowFromDB,
  getWorkflowsByAdmin,
  type WorkflowDBRecord,
  DatabaseError,
} from './database-utility';

// Admin Action Logger
export {
  logWorkflowCreated,
  logWarningsGenerated,
  logWarningsSent,
  logWarningsExported,
  logWorkflowLocked,
  logWorkflowCompleted,
  logWorkflowFailed,
  getWorkflowActions,
  getRecentWarningActions,
  AdminActionLoggerError,
} from './admin-action-logger';

// Integrated Workflow Manager (DB + Storage + Logging)
export {
  saveWarnings,
  trackEmailsSent,
  trackExport,
  getCompleteWorkflow,
  WorkflowManagerError,
} from './workflow-manager';

// Date Collector
export {
  collectDateRange,
  collectServiceAttendance,
  collectMultiServiceAttendance,
  collectServicesInDateRange,
  mergeServiceAbsentees,
  filterByMissCount,
  type ServiceMetadata,
  type ServiceAttendanceData,
  type DateRange,
  DateCollectorError,
} from './date-collector';

// Student List Generator
export {
  generateWarningList,
  fetchStudentContacts,
  enrichWithContactInfo,
  groupByLevel,
  sortWarningList,
  filterByMinMissCount,
  getWarningListSummary,
  type StudentContactInfo,
  type AbsenteeWithServices,
  type WarningListSummary,
  StudentListError,
} from './student-list-generator';

// Export Utility
export {
  exportWarningListToCSV,
  exportWarningListToPDF,
  generateIndividualWarningLetter,
  exportIndividualLettersBatch,
  type ExportFormat,
  type ExportOptions,
  ExportError,
} from './export-utility';

// Emailer Utility
export {
  sendWarningEmail,
  sendWarningEmailsBatch,
  sendTestEmail,
  validateEmailConfig,
  generateEmailSubject,
  generateEmailBody,
  type EmailTemplate,
  type EmailResult,
  type EmailBatchResult,
  type EmailConfig,
  EmailError,
} from './emailer-utility';

// Batch Parser
export {
  validateBatchSelection,
  parseBatchSelection,
  buildServiceMetadataMap,
  optimizeBatchQuery,
  splitBatchQuery,
  getBatchQuerySummary,
  isValidDateFormat,
  type BatchSelection,
  type BatchQuery,
  type ServiceRegistryEntry,
  type BatchQuerySummary,
  BatchParserError,
} from './batch-parser';

// Workflow Meta Manager
export {
  createWorkflow,
  updateWorkflow,
  lockWorkflow,
  completeWorkflow,
  failWorkflow,
  getWorkflow,
  listWorkflowsByMode,
  listWorkflowsByStatus,
  getWorkflowStatistics,
  isWeekProcessed,
  getOverlappingWorkflows,
  validateWorkflowCreation,
  getRecentWorkflows,
  deleteWorkflow,
  formatWorkflowSummary,
  type WorkflowMode,
  type WorkflowStatus,
  type CreateWorkflowParams,
  type UpdateWorkflowParams,
  type WorkflowStatistics,
  type WorkflowSummary,
  WorkflowMetaError,
} from './workflow-meta-manager';

/**
 * Utility function to get all error types
 */
export const ErrorTypes = {
  WeekDeriverError,
  WarningStorageError,
  DateCollectorError,
  StudentListError,
  ExportError,
  EmailError,
  BatchParserError,
  WorkflowMetaError,
} as const;