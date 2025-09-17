import { api } from "@/lib/requestFactory";

export interface LogAdminActionParams {
  action_template?: string;
  action?: string;
  object_type?:
    | "exeat"
    | "service"
    | "student"
    | "admin"
    | "system"
    | "warning"
    | "attendance";
  object_id?: string;
  object_label?: string;
  details?: {
    reason?: string;
    description?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Utility function to log admin actions using the centralized admin actions API
 * This should be used instead of direct database inserts to admin_actions table
 */
export async function logAdminAction(
  params: LogAdminActionParams,
  token: string
): Promise<void> {
  try {
    await api.post("/api/admin-actions", params, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // Don't throw error to avoid breaking the main operation
  }
}

// Warning-specific helper functions
export const WarningActions = {
  generateWarnings: (week: string, count: number, token: string) =>
    logAdminAction(
      {
        action_template: "GENERATE_WARNINGS",
        object_type: "warning",
        object_label: week,
        details: {
          metadata: { week, count },
        },
      },
      token
    ),

  sendWarning: (studentName: string, studentId: string, token: string) =>
    logAdminAction(
      {
        action_template: "SEND_WARNING",
        object_type: "warning",
        object_id: studentId,
        object_label: studentName,
      },
      token
    ),

  bulkSendWarnings: (count: number, token: string) =>
    logAdminAction(
      {
        action_template: "BULK_SEND_WARNINGS",
        object_type: "warning",
        details: {
          metadata: { count },
        },
      },
      token
    ),

  generatePDF: (studentName: string, studentId: string, token: string) =>
    logAdminAction(
      {
        action_template: "GENERATE_WARNING_PDF",
        object_type: "warning",
        object_id: studentId,
        object_label: studentName,
      },
      token
    ),

  updateWarning: (
    studentName: string,
    studentId: string,
    status: string,
    token: string
  ) =>
    logAdminAction(
      {
        action_template: "UPDATE_WARNING",
        object_type: "warning",
        object_id: studentId,
        object_label: studentName,
        details: {
          metadata: { status },
        },
      },
      token
    ),
};

// Attendance-specific helper functions
export const AttendanceActions = {
  uploadFile: (
    serviceName: string,
    serviceId: string,
    fileName: string,
    token: string
  ) =>
    logAdminAction(
      {
        action_template: "UPLOAD_ATTENDANCE_FILE",
        object_type: "attendance",
        object_id: serviceId,
        object_label: serviceName,
        details: {
          metadata: { fileName },
        },
      },
      token
    ),

  confirmUpload: (
    serviceName: string,
    serviceId: string,
    attendeeCount: number,
    token: string
  ) =>
    logAdminAction(
      {
        action_template: "CONFIRM_ATTENDANCE_UPLOAD",
        object_type: "attendance",
        object_id: serviceId,
        object_label: serviceName,
        details: {
          metadata: { attendeeCount },
        },
      },
      token
    ),

  processFile: (
    serviceName: string,
    serviceId: string,
    matchedCount: number,
    unmatchedCount: number,
    token: string
  ) =>
    logAdminAction(
      {
        action_template: "PROCESS_ATTENDANCE_FILE",
        object_type: "attendance",
        object_id: serviceId,
        object_label: serviceName,
        details: {
          metadata: { matchedCount, unmatchedCount },
        },
      },
      token
    ),

  cancelUpload: (
    serviceName: string,
    serviceId: string,
    reason: string,
    token: string
  ) =>
    logAdminAction(
      {
        action: `Cancelled attendance upload for ${serviceName}`,
        object_type: "attendance",
        object_id: serviceId,
        object_label: serviceName,
        details: {
          reason,
        },
      },
      token
    ),
};
