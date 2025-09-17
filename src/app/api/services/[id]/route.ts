import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { ServiceService } from "@/services/ServiceService";

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schemas
const updateServiceSchema = z.object({
  service_type: z.enum(["devotion", "special", "seminar"]).optional(),
  devotion_type: z.enum(["morning", "evening"]).optional(),
  name: z.string().optional(),
  date: z.string().optional(),
  time: z
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .optional(),
  applicable_levels: z.array(z.string()).optional(),
  gender_constraint: z.enum(["male", "female", "both"]).optional(),
  status: z
    .enum(["scheduled", "active", "completed", "canceled", "cancelled"])
    .optional(),
});

// Helper function to get authenticated admin from request
async function getAdminFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return { error: "Unauthorized", status: 401 };
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { error: "Invalid token", status: 401 };
    }

    // Get admin record with role information
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id, role, first_name, last_name, email")
      .eq("auth_user_id", user.id)
      .single();

    if (adminError || !admin) {
      return { error: "Admin access required", status: 403 };
    }

    return { admin };
  } catch (error) {
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
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: adminId,
      action,
      object_type: objectType,
      object_id: objectId,
      object_label: objectLabel,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin action logging error:", error);
  }
}

export async function GET(
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

    const resolvedParams = await params;
    const serviceId = resolvedParams.id;

    // Get service with service levels
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select(
        `
        id,
        service_type,
        devotion_type,
        name,
        service_date,
        service_time,
        status,
        created_by,
        created_at,
        locked_after_ingestion,
        gender_constraint,
        service_levels(
          level_id,
          levels(code, name)
        )
      `
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

    // Transform service for response
    const applicable_levels = (service.service_levels || [])
      .map((sl: any) => sl.levels?.code)
      .filter(Boolean);
    const uiType =
      service.service_type === "special"
        ? "special"
        : service.devotion_type === "evening"
        ? "evening"
        : "morning";

    const transformedService = {
      id: service.id,
      type: uiType,
      name: service.name,
      service_date: service.service_date,
      service_time: service.service_time,
      date: service.service_date,
      status: service.status,
      created_by: service.created_by,
      created_at: service.created_at,
      locked_after_ingestion: service.locked_after_ingestion,
      gender_constraint: service.gender_constraint,
      applicable_levels,
    };

    return NextResponse.json(transformedService);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "An unexpected error occurred while fetching service",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    // Accept partial fields per workflow Service shape (UI enums)
    const parsed = updateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }
    const svc = new ServiceService();
    const updated = await svc.updateService(id, parsed.data as any);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: (error as any)?.status || 500 }
    );
  }
}

export async function DELETE(
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

    const resolvedParams = await params;
    const serviceId = resolvedParams.id;

    // Check if service exists
    const { data: existingService, error: fetchError } = await supabaseAdmin
      .from("services")
      .select(
        "id, service_type, devotion_type, name, status, locked_after_ingestion"
      )
      .eq("id", serviceId)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json(
        {
          error: "Service not found",
          details: fetchError?.message || "No service found with this ID",
        },
        { status: 404 }
      );
    }

    if (existingService.locked_after_ingestion) {
      return NextResponse.json(
        {
          error: "Service is locked",
          details: "Cannot cancel service after attendance has been ingested",
        },
        { status: 409 }
      );
    }

    // Soft delete by setting status to canceled
    const { error: deleteError } = await supabaseAdmin
      .from("services")
      .update({ status: "canceled" })
      .eq("id", serviceId);

    if (deleteError) {
      return NextResponse.json(
        {
          error: "Failed to cancel service",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    // Log admin action
    await logAdminAction(
      admin.id,
      "cancel_service",
      "service",
      serviceId,
      existingService.name ||
        ((existingService as any).service_type !== "devotion"
          ? "special"
          : (existingService as any).devotion_type === "evening"
          ? "evening"
          : "morning"),
      { previous_status: existingService.status }
    );

    return NextResponse.json({
      message: "Service cancelled successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: "An unexpected error occurred while cancelling service",
      },
      { status: 500 }
    );
  }
}
