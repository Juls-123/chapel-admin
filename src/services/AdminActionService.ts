import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface LogAdminActionParams {
  admin_id: string;
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
 * Server-side admin action logging service
 * This directly inserts into the database instead of making HTTP requests
 */
export class AdminActionService {
  /**
   * Log admin action directly to database
   */
  static async logAction(params: LogAdminActionParams): Promise<void> {
    try {
      const insertData: Database["public"]["Tables"]["admin_actions"]["Insert"] =
        {
          admin_id: params.admin_id,
          action: params.action || params.action_template || "Unknown Action",
          object_type: params.object_type,
          object_id: params.object_id,
          object_label: params.object_label,
          details: params.details || null,
          created_at: new Date().toISOString(),
        };

      const { error } = await supabaseAdmin
        .from("admin_actions")
        .insert(insertData);

      if (error) {
        console.error("Failed to log admin action:", error);
        // Don't throw error to avoid breaking the main operation
      }
    } catch (error) {
      console.error("Failed to log admin action:", error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get admin actions with filters
   */
  static async getActions(filters?: {
    admin_id?: string;
    action?: string;
    object_type?: string;
    date_range?: { start: string; end: string };
    limit?: number;
  }): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from("admin_actions")
        .select(
          `
          *,
          admins!inner(
            first_name,
            last_name,
            email
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filters?.admin_id) {
        query = query.eq("admin_id", filters.admin_id);
      }

      if (filters?.action) {
        query = query.ilike("action", `%${filters.action}%`);
      }

      if (filters?.object_type) {
        query = query.eq("object_type", filters.object_type);
      }

      if (filters?.date_range) {
        query = query
          .gte("created_at", filters.date_range.start)
          .lte("created_at", filters.date_range.end);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch admin actions:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Failed to fetch admin actions:", error);
      return [];
    }
  }
}

// Attendance-specific helper functions using the new service
export const AttendanceActions = {
  uploadFile: (
    serviceName: string,
    serviceId: string,
    fileName: string,
    adminId: string
  ) =>
    AdminActionService.logAction({
      admin_id: adminId,
      action_template: "UPLOAD_ATTENDANCE_FILE",
      object_type: "attendance",
      object_id: serviceId,
      object_label: serviceName,
      details: {
        metadata: { fileName },
      },
    }),

  confirmUpload: (
    serviceName: string,
    serviceId: string,
    attendeeCount: number,
    adminId: string
  ) =>
    AdminActionService.logAction({
      admin_id: adminId,
      action_template: "CONFIRM_ATTENDANCE_UPLOAD",
      object_type: "attendance",
      object_id: serviceId,
      object_label: serviceName,
      details: {
        metadata: { attendeeCount },
      },
    }),

  processFile: (
    serviceName: string,
    serviceId: string,
    matchedCount: number,
    unmatchedCount: number,
    adminId: string
  ) =>
    AdminActionService.logAction({
      admin_id: adminId,
      action_template: "PROCESS_ATTENDANCE_FILE",
      object_type: "attendance",
      object_id: serviceId,
      object_label: serviceName,
      details: {
        metadata: { matchedCount, unmatchedCount },
      },
    }),

  cancelUpload: (
    serviceName: string,
    serviceId: string,
    reason: string,
    adminId: string
  ) =>
    AdminActionService.logAction({
      admin_id: adminId,
      action: `Cancelled attendance upload for ${serviceName}`,
      object_type: "attendance",
      object_id: serviceId,
      object_label: serviceName,
      details: {
        reason,
      },
    }),
};
