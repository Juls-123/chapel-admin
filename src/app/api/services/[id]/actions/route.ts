import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for service actions
const serviceActionSchema = z.object({
  action: z.enum(["copy", "cancel", "complete", "export_attendance"]),
  data: z
    .object({
      new_date: z.string().optional(),
      export_format: z.enum(["csv", "xlsx"]).optional(),
    })
    .optional(),
});

// Helper function to get authenticated admin from request
async function getAdminFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { error: "Missing or invalid authorization header", status: 401 };
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return { error: "Invalid token", status: 401 };
    }

    // Get admin record with role information
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id, role, first_name, last_name, email")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !admin) {
      console.error("Admin lookup error:", adminError);
      return { error: "Admin access required", status: 403 };
    }

    return { admin };
  } catch (error) {
    console.error("Authentication error:", error);
    return { error: "Authentication failed", status: 500 };
  }
}

// Helper function to log admin actions
async function logAdminAction(
  adminId: string,
  action: string,
  objectType: string | null = null,
  objectId: string | null = null,
  objectLabel: string | null = null,
  details: Record<string, any> = {}
) {
  try {
    const { error } = await supabaseAdmin.from("admin_actions").insert({
      admin_id: adminId,
      action,
      object_type: objectType,
      object_id: objectId,
      object_label: objectLabel,
      details,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log admin action:", error);
    }
  } catch (error) {
    console.error("Admin action logging error:", error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    const authResult = await getAdminFromRequest(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    const { admin } = authResult;

    const { id: serviceId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = serviceActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid action data",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { action, data } = validation.data;

    // Get the service first
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select(
        "id, service_type, devotion_type, name, service_date, status, created_by, locked_after_ingestion"
      )
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        {
          error: "Service not found",
          details: serviceError?.message || "No service found with this ID",
        },
        { status: 404 }
      );
    }

    // Compute UI label for type once
    const uiType =
      service.service_type === "special"
        ? "special"
        : service.devotion_type === "evening"
        ? "evening"
        : "morning";

    let result: any = {};

    switch (action) {
      case "copy":
        if (!data?.new_date) {
          return NextResponse.json(
            {
              error: "New date is required for copy action",
            },
            { status: 400 }
          );
        }

        // Create a copy of the service with new date
        const { data: newService, error: copyError } = await supabaseAdmin
          .from("services")
          .insert({
            service_type: service.service_type,
            devotion_type:
              service.service_type === "special" ? null : service.devotion_type,
            name: service.name,
            service_date: data.new_date,
            status: "scheduled",
            created_by: admin.id,
            locked_after_ingestion: false,
          })
          .select()
          .single();

        if (copyError) {
          return NextResponse.json(
            {
              error: "Failed to copy service",
              details: copyError.message,
            },
            { status: 500 }
          );
        }

        // Copy service levels from original service
        const { data: originalLevels, error: levelsError } = await supabaseAdmin
          .from("service_levels")
          .select("level_id, constraints")
          .eq("service_id", serviceId);

        if (!levelsError && originalLevels && originalLevels.length > 0) {
          const levelInserts = originalLevels.map((level: any) => ({
            service_id: newService.id,
            level_id: level.level_id,
            constraints: level.constraints,
          }));

          await supabaseAdmin.from("service_levels").insert(levelInserts);
        }

        await logAdminAction(
          admin.id,
          "copied_service",
          "service",
          newService.id,
          service.name || uiType,
          { original_service_id: serviceId, new_date: data.new_date }
        );

        result = {
          message: "Service copied successfully",
          new_service_id: newService.id,
        };
        break;

      case "cancel":
        const { error: cancelError } = await supabaseAdmin
          .from("services")
          .update({ status: "canceled" })
          .eq("id", serviceId);

        if (cancelError) {
          return NextResponse.json(
            {
              error: "Failed to cancel service",
              details: cancelError.message,
            },
            { status: 500 }
          );
        }

        await logAdminAction(
          admin.id,
          "canceled_service",
          "service",
          serviceId,
          service.name || uiType
        );

        result = { message: "Service canceled successfully" };
        break;

      case "complete":
        const { error: completeError } = await supabaseAdmin
          .from("services")
          .update({ status: "completed" })
          .eq("id", serviceId);

        if (completeError) {
          return NextResponse.json(
            {
              error: "Failed to complete service",
              details: completeError.message,
            },
            { status: 500 }
          );
        }

        await logAdminAction(
          admin.id,
          "completed_service",
          "service",
          serviceId,
          service.name || uiType
        );

        result = { message: "Service completed successfully" };
        break;

      case "export_attendance":
        // This would typically query attendance data and format it
        // For now, return a placeholder response
        const { data: attendanceData, error: attendanceError } =
          await supabaseAdmin
            .from("attendance")
            .select(
              `
            id,
            student_id,
            scanned_at,
            status,
            students(matric_number, first_name, last_name, email)
          `
            )
            .eq("service_id", serviceId);

        if (attendanceError) {
          return NextResponse.json(
            {
              error: "Failed to fetch attendance data",
              details: attendanceError.message,
            },
            { status: 500 }
          );
        }

        const formattedData = (attendanceData || []).map((record: any) => ({
          matric_number: record.students?.matric_number,
          student_name: `${record.students?.first_name} ${record.students?.last_name}`,
          email: record.students?.email,
          status: record.status,
          scanned_at: record.scanned_at,
        }));

        await logAdminAction(
          admin.id,
          "exported_attendance",
          "service",
          serviceId,
          service.name || uiType,
          {
            export_format: data?.export_format || "csv",
            record_count: formattedData.length,
          }
        );

        result = {
          message: "Attendance data exported successfully",
          data: formattedData,
          filename: `${service.name || uiType}_attendance_${
            service.service_date
          }.csv`,
        };
        break;

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Service action error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "An unexpected error occurred while performing the action",
      },
      { status: 500 }
    );
  }
}
