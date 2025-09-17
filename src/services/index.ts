// lib/services/index.ts

// Export service functions explicitly to avoid type conflicts
export {
  // Students
  createStudent,
  bulkUploadStudents,
  getStudent,
  getStudentByMatric,
  getStudents,
  getStudentProfile,
  updateStudent,
  updateStudentStatus,
  getStudentAttendanceHistory,
  getStudentExeatHistory,
  getStudentWarningHistory,
  getUploadErrors,
  logUploadError,
  searchStudents,
  validateStudentMatricNumber,
  getStudentStats,
  type Student,
  type StudentProfile,
  type BulkUploadResult,
  type UploadError,
} from "./students";

export {
  // Services
  createService,
  updateService,
  cancelService,
  lockService,
  getService,
  getServices,
  getTodaysServices,
  getServiceAttendees,
  createSemester,
  updateSemester,
  getSemester,
  getSemesters,
  getCurrentSemester,
  createServiceTemplate,
  updateServiceTemplate,
  getServiceTemplate,
  getServiceTemplates,
  createServiceFromTemplate,
  addServiceLevel,
  updateServiceLevel,
  getServiceLevels,
  removeServiceLevel,
  exportServiceAttendance,
  checkServiceCompletion,
  markServiceCompleted,
  getServiceStats,
  validateServiceDateTime,
  type Service,
  type Semester,
  type ServiceTemplate,
  type ServiceLevel,
  type TodayService,
} from "./services";

export {
  // Attendance
  uploadAttendanceFile,
  confirmAttendanceUpload,
  previewAttendanceUpload,
  getAttendees,
  getAbsentees,
  getAttendanceByService,
  getAttendanceByDate,
  getMonthlyTopAbsentees,
  exportAttendance,
  createManualOverride,
  createBulkManualOverrides,
  getManualOverrides,
  getAttendanceRecords,
  updateAttendanceRecord,
  getUploadHistory,
  getUploadById,
  retryFailedUpload,
  createIssue,
  resolveIssue,
  getIssues,
  getUnresolvedIssues,
  generateAttendanceSummary,
  getDailyAttendanceTotals,
  getAttendanceStats,
  getStudentAttendanceRate,
  validateAttendanceData,
  type AttendanceBatchVersion,
  type AttendanceRecord as AttendanceRecordType,
  type AttendanceSummary,
  type ScanArchive,
  type ManualOverride,
  type UploadHistory,
  type Issue,
  type AttendancePreview,
} from "./attendance";

export {
  // Discipline
  createExeat,
  updateExeat,
  endExeat,
  cancelExeat,
  getExeat,
  getExeats,
  getStudentExeats,
  getExeatsEndingToday,
  getDailyEndingExeatsCount,
  isStudentOnExeat,
  generateWarningLetters,
  getWarningLetter,
  getWarningLetters,
  getPendingWarnings,
  sendWarningLetter,
  sendBulkWarningLetters,
  resendWarningLetter,
  cancelWarningLetter,
  exportWarningLettersPDF,
  getStudentWarningLetters,
  getWeeklySnapshot,
  getWeeklySnapshots,
  updateWeeklySnapshot,
  getStudentsWithExcessiveAbsences,
  getSemesterAbsences,
  getStudentSemesterAbsences,
  updateSemesterAbsences,
  getTopAbsenteesForSemester,
  getDisciplineStats,
  getWarningTrends,
  getExeatTrends,
  validateExeatDates,
  calculateWarningLevel,
  getStudentDisciplineHistory,
  type Exeat,
  type WarningWeeklySnapshot,
  type WarningLetter,
  type SemesterAbsence,
  type ExeatEndingToday,
  type PendingWarning,
} from "./discipline";

export {
  // Admin
  createAdmin,
  updateAdmin,
  promoteAdmin,
  deleteAdmin,
  getAdmin,
  getAdminByEmail,
  getAdmins,
  getCurrentAdmin,
  resetAdminPassword,
  logAdminAction,
  getAdminActions,
  getRecentAdminActions,
  getAdminActionsByDate,
  getAdminActivityStats,
  getDashboardStats,
  getWelcomeCounter,
  getTopAbsentees,
  getSystemHealth,
  createOverrideReason,
  updateOverrideReason,
  getOverrideReasons,
  getOverrideReason,
  getOverrideReasonByCode,
  toggleOverrideReasonStatus,
  createServiceConstraint,
  updateServiceConstraint,
  getServiceConstraints,
  getServiceConstraint,
  toggleServiceConstraintStatus,
  getSecurityLog,
  logSecurityEvent,
  validateAdminPermissions,
  getDataExportLog,
  validateAdminEmail,
  getAdminStats,
  generateSystemReport,
  type Admin,
  type AdminAction,
  type OverrideReasonDefinition,
  type ServiceConstraintDefinition,
  type RecentAdminAction,
  type DashboardStats,
} from "./admin";

// Common types and interfaces used across domains
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

export interface DateRange {
  start: string;
  end: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Common error types
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ""} not found`,
      "NOT_FOUND",
      404
    );
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = "Unauthorized access") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

// Utility functions for common operations
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function createErrorResponse(error: string | Error): ApiResponse<never> {
  return {
    success: false,
    error: typeof error === "string" ? error : error.message,
  };
}

// Common validation helpers
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === "") {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format", "email");
  }
}

export function validateMatricFormat(matric: string): void {
  // Adjust regex based on your matric number format
  const matricRegex = /^[A-Z]{2,3}\/\d{2}\/\d{4}$/;
  if (!matricRegex.test(matric)) {
    throw new ValidationError("Invalid matric number format", "matric_number");
  }
}

export function validateDateRange(start: string, end: string): void {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ValidationError("Invalid date format");
  }

  if (startDate >= endDate) {
    throw new ValidationError("Start date must be before end date");
  }
}

export function validateLevel(level: string): void {
  const validLevels = ["100", "200", "300", "400", "500"];
  if (!validLevels.includes(level)) {
    throw new ValidationError(
      "Invalid level. Must be 100, 200, 300, 400, or 500",
      "level"
    );
  }
}

export function validateGender(gender: string): void {
  const validGenders = ["male", "female", "other"];
  if (!validGenders.includes(gender)) {
    throw new ValidationError(
      "Invalid gender. Must be male, female, or other",
      "gender"
    );
  }
}

// Date utility functions
export function formatDateForDB(date: Date | string): string {
  return new Date(date).toISOString();
}

export function getWeekStart(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export function getCurrentSemesterDates(): { start: string; end: string } {
  // This is a placeholder - implement based on your semester calendar
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Example: Jan-May is Spring, Aug-Dec is Fall
  if (month >= 0 && month <= 4) {
    return {
      start: `${year}-01-15`,
      end: `${year}-05-31`,
    };
  } else {
    return {
      start: `${year}-08-15`,
      end: `${year}-12-31`,
    };
  }
}

// File processing utilities
export function validateCSVHeaders(
  headers: string[],
  requiredHeaders: string[]
): void {
  const missingHeaders = requiredHeaders.filter(
    (required) =>
      !headers.some(
        (header) => header.trim().toLowerCase() === required.toLowerCase()
      )
  );

  if (missingHeaders.length > 0) {
    throw new ValidationError(
      `Missing required CSV headers: ${missingHeaders.join(", ")}`
    );
  }
}

export function sanitizeCSVData(data: any[]): any[] {
  return data.map((row) => {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(row)) {
      // Trim whitespace and handle empty strings
      const cleanKey = key.trim();
      const cleanValue = typeof value === "string" ? value.trim() : value;
      sanitized[cleanKey] = cleanValue === "" ? null : cleanValue;
    }
    return sanitized;
  });
}

// Logging utility for service layer
export function logServiceOperation(
  operation: string,
  data: any,
  userId?: string
): void {
  console.log(`[SERVICE] ${operation}`, {
    timestamp: new Date().toISOString(),
    operation,
    userId,
    data: JSON.stringify(data, null, 2),
  });
}
