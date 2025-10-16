import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Action templates for consistency
const ACTION_TEMPLATES = {
  // Exeat actions
  APPROVE_EXEAT: (studentName: string) => `Approved Exeat for ${studentName}`,
  REJECT_EXEAT: (studentName: string) => `Rejected Exeat for ${studentName}`,

  // Service actions
  CREATE_SERVICE: (serviceName: string) => `Created Service ${serviceName}`,
  CANCEL_SERVICE: (serviceName: string) => `Cancelled Service ${serviceName}`,
  UPDATE_SERVICE: (serviceName: string) => `Updated Service ${serviceName}`,

  // Student actions
  MANUALLY_CLEAR: (studentName: string) => `Manually Cleared ${studentName}`,
  MARK_PRESENT: (studentName: string) => `Marked Present ${studentName}`,
  MARK_ABSENT: (studentName: string) => `Marked Absent ${studentName}`,

  // Warning actions
  GENERATE_WARNINGS: (week: string, count: number) =>
    `Generated ${count} warning letters for week ${week}`,
  SEND_WARNING: (studentName: string) =>
    `Sent warning letter to ${studentName}`,
  BULK_SEND_WARNINGS: (count: number) =>
    `Sent ${count} pending warning letters`,
  GENERATE_WARNING_PDF: (studentName: string) =>
    `Generated PDF warning letter for ${studentName}`,
  UPDATE_WARNING: (studentName: string) =>
    `Updated warning letter for ${studentName}`,

  // Attendance actions
  UPLOAD_ATTENDANCE_FILE: (serviceName: string, fileName: string) =>
    `Uploaded attendance file ${fileName} for ${serviceName}`,
  CONFIRM_ATTENDANCE_UPLOAD: (serviceName: string, attendeeCount: number) =>
    `Confirmed attendance upload for ${serviceName} (${attendeeCount} attendees)`,
  PROCESS_ATTENDANCE_FILE: (
    serviceName: string,
    matchedCount: number,
    unmatchedCount: number
  ) =>
    `Processed attendance file for ${serviceName} (${matchedCount} matched, ${unmatchedCount} unmatched)`,

  // Generic actions
  CUSTOM: (action: string) => action,
} as const;

const createAdminActionSchema = z.object({
  // Use template key for consistency
  action_template: z.string().optional(),

  // Or allow custom action (fallback)
  action: z.string().min(1, "Action is required"),

  object_type: z
    .enum(["exeat", "service", "student", "admin", "system", "warning"])
    .optional(),
  object_id: z.string().optional(),
  object_label: z.string().optional(),

  // Structured details for better formatting
  details: z
    .object({
      reason: z.string().optional(),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Enhanced query with better formatting
    const { data, error } = await supabaseAdmin
      .from("admin_actions")
      .select(
        `
        id,
        action,
        object_type,
        object_id,
        object_label,
        details,
        created_at,
        admins!admin_actions_admin_id_fkey(
          first_name,
          last_name
        )
      `
      )
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin actions:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch admin actions",
          code: "DB_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Transform data for better display
    const transformedData =
      data?.map((item: any) => ({
        id: item.id,
        action: item.action,
        object_type: item.object_type,
        object_id: item.object_id,
        object_label: item.object_label,
        details: item.details,
        created_at: item.created_at,
        admin_name: item.admins
          ? `${item.admins.first_name} ${item.admins.last_name}`
          : "System",
        // Format for display
        display_text: formatActionForDisplay(item),
        formatted_date: formatDateForDisplay(item.created_at),
      })) || [];

    return NextResponse.json(transformedData);
  } catch (error) {
    const status = (error as any)?.status || 500;
    const code =
      (error as any)?.code ||
      (status === 401
        ? "UNAUTHORIZED"
        : status === 403
        ? "FORBIDDEN"
        : "INTERNAL_ERROR");
    return NextResponse.json(
      { error: (error as any)?.message || "Internal server error", code },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin();

    const body = await request.json();
    const validationResult = createAdminActionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      action_template,
      action,
      object_type,
      object_id,
      object_label,
      details,
    } = validationResult.data;

    // Use template if provided, otherwise use custom action
    let finalAction = action;
    if (
      action_template &&
      ACTION_TEMPLATES[action_template as keyof typeof ACTION_TEMPLATES]
    ) {
      const template =
        ACTION_TEMPLATES[action_template as keyof typeof ACTION_TEMPLATES];
      if (typeof template === "function") {
        // Handle templates that need different arguments
        const templateName = action_template as keyof typeof ACTION_TEMPLATES;
        if (templateName === "GENERATE_WARNINGS") {
          // GENERATE_WARNINGS needs week and count
          const count = details?.metadata?.count || 0;
          const week = details?.metadata?.week || object_label || "";
          finalAction = (template as any)(week, count);
        } else if (templateName === "BULK_SEND_WARNINGS") {
          // BULK_SEND_WARNINGS needs only count
          const count = details?.metadata?.count || 0;
          finalAction = (template as any)(count);
        } else if (templateName === "UPLOAD_ATTENDANCE_FILE") {
          // UPLOAD_ATTENDANCE_FILE needs serviceName and fileName
          const fileName = details?.metadata?.fileName || "";
          finalAction = (template as any)(object_label, fileName);
        } else if (templateName === "CONFIRM_ATTENDANCE_UPLOAD") {
          // CONFIRM_ATTENDANCE_UPLOAD needs serviceName and attendeeCount
          const attendeeCount = details?.metadata?.attendeeCount || 0;
          finalAction = (template as any)(object_label, attendeeCount);
        } else if (templateName === "PROCESS_ATTENDANCE_FILE") {
          // PROCESS_ATTENDANCE_FILE needs serviceName, matchedCount, and unmatchedCount
          const matchedCount = details?.metadata?.matchedCount || 0;
          const unmatchedCount = details?.metadata?.unmatchedCount || 0;
          finalAction = (template as any)(
            object_label,
            matchedCount,
            unmatchedCount
          );
        } else {
          // Standard single argument templates
          finalAction = template(object_label || "");
        }
      } else {
        finalAction = template;
      }
    }

    const { data: newAction, error: insertError } = await supabaseAdmin
      .from("admin_actions")
      .insert({
        admin_id: admin.id,
        action: finalAction,
        object_type,
        object_id,
        object_label,
        details,
      })
      .select(
        `
        id,
        action,
        object_type,
        object_id,
        object_label,
        details,
        created_at,
        admins!admin_actions_admin_id_fkey(first_name, last_name)
      `
      )
      .single();

    if (insertError) {
      console.error("Error creating admin action:", insertError);
      return NextResponse.json(
        {
          error: "Failed to create admin action",
          code: "DB_ERROR",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    const transformedData = {
      ...newAction,
      admin_name: (newAction as any).admins
        ? `${(newAction as any).admins.first_name} ${
            (newAction as any).admins.last_name
          }`
        : "System",
      display_text: formatActionForDisplay(newAction),
      formatted_date: formatDateForDisplay((newAction as any).created_at),
      admins: undefined,
    };

    return NextResponse.json(transformedData, { status: 201 });
  } catch (error) {
    const status = (error as any)?.status || 500;
    const code =
      (error as any)?.code ||
      (status === 401
        ? "UNAUTHORIZED"
        : status === 403
        ? "FORBIDDEN"
        : "INTERNAL_ERROR");
    return NextResponse.json(
      { error: (error as any)?.message || "Internal server error", code },
      { status }
    );
  }
}

// Helper functions for formatting
function formatActionForDisplay(action: any): string {
  const reason = action.details?.reason;
  if (reason) {
    return `${action.action}\n${reason}`;
  }

  const description = action.details?.description;
  if (description) {
    return `${action.action}\n${description}`;
  }

  return action.action;
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

// Export helper function for easy logging from other parts of your app
export class AdminActionLogger {
  static async logExeatApproval(
    studentName: string,
    reason: string,
    adminToken: string
  ) {
    return this.logAction(
      {
        action_template: "APPROVE_EXEAT",
        object_type: "exeat",
        object_label: studentName,
        details: { reason: `Approved for '${reason}'` },
      },
      adminToken
    );
  }

  static async logServiceCreation(
    serviceName: string,
    description: string,
    adminToken: string
  ) {
    return this.logAction(
      {
        action_template: "CREATE_SERVICE",
        object_type: "service",
        object_label: serviceName,
        details: { description },
      },
      adminToken
    );
  }

  static async logManualClear(
    studentName: string,
    reason: string,
    adminToken: string
  ) {
    return this.logAction(
      {
        action_template: "MANUALLY_CLEAR",
        object_type: "student",
        object_label: studentName,
        details: { reason: `Cleared for ${reason}` },
      },
      adminToken
    );
  }

  static async logServiceCancellation(
    serviceName: string,
    reason: string,
    adminToken: string
  ) {
    return this.logAction(
      {
        action_template: "CANCEL_SERVICE",
        object_type: "service",
        object_label: serviceName,
        details: { reason: `Cancelled due to ${reason}` },
      },
      adminToken
    );
  }

  private static async logAction(payload: any, adminToken: string) {
    const response = await fetch("/api/admin-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  }
}
