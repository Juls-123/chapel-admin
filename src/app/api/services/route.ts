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

// Validation schemas (kept for future optional server-side filters if needed)
const serviceQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform((val) => parseInt(val, 10)),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((val) => parseInt(val, 10)),
  type: z.enum(["morning", "evening", "special"]).optional(),
  status: z
    .union([
      z.enum(["scheduled", "active", "completed", "canceled"]),
      z
        .string()
        .transform(
          (val) =>
            val
              .split(",")
              .filter((s) =>
                ["scheduled", "active", "completed", "canceled"].includes(
                  s.trim()
                )
              ) as ("scheduled" | "active" | "completed" | "canceled")[]
        ),
    ])
    .optional(),
  service_date: z.string().optional(), // Add service_date support
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  date: z.string().optional(),
  search: z.string().optional(),
});

const createServiceSchema = z.object({
  // New schema fields
  service_type: z.enum(["devotion", "special", "seminar"]),
  devotion_type: z.enum(["morning", "evening"]).optional(),
  name: z.string().optional(),
  date: z.string(), // ISO date string
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Please enter a valid time in HH:mm format.",
  }),
  applicable_levels: z.array(z.string()).min(1, {
    message: "At least one level must be selected.",
  }),
  gender_constraint: z.enum(["male", "female", "both"]),
});

// Helper function to log admin actions server-side
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

export async function GET(request: NextRequest) {
  try {
    // Any admin can view services
    await requireAdmin(request);
    const service = new ServiceService();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const parsed = serviceQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const { date, service_date, status } = parsed.data;

    // Use service_date if provided, otherwise fall back to date
    const filterDate = service_date || date;

    // Handle status filtering - support both single and multiple statuses
    let statusFilter:
      | ("scheduled" | "active" | "completed" | "canceled")[]
      | undefined;
    if (status) {
      statusFilter = Array.isArray(status) ? status : [status];
    }

    const items = await service.getServices(filterDate, statusFilter);

    // Workflow requires plain array output
    return NextResponse.json(items);
  } catch (error: any) {
    const status = error?.status || 500;
    const code =
      error?.code ||
      (status === 401
        ? "UNAUTHORIZED"
        : status === 403
        ? "FORBIDDEN"
        : "INTERNAL_ERROR");
    const message =
      status === 401 || status === 403
        ? error?.message
        : "Internal server error";
    return NextResponse.json(
      { error: message, code, details: error?.details },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin(request); // allow any admin to create per workflow

    const body = await request.json();
    const parsed = createServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      service_type,
      devotion_type,
      name,
      date,
      time,
      applicable_levels,
      gender_constraint,
    } = parsed.data;

    // Convert new schema to format expected by ServiceService
    const [hours, minutes] = time.split(":").map(Number);
    const serviceDateTime = new Date(date);
    serviceDateTime.setHours(hours, minutes, 0, 0);

    // Convert service_type/devotion_type to legacy type format for ServiceService
    const legacyType = service_type === "devotion" ? devotion_type! : "special";

    // Auto-generate name for devotions if not provided
    const serviceName =
      service_type === "devotion"
        ? devotion_type === "morning"
          ? "Morning Devotion"
          : "Evening Devotion"
        : name;

    // Convert level IDs to codes - fetch levels to map IDs to codes
    const { data: levels, error: levelsError } = await supabaseAdmin
      .from("levels")
      .select("id, code")
      .in("id", applicable_levels);

    if (levelsError) {
      return NextResponse.json(
        {
          error: "Failed to fetch levels",
          code: "LEVELS_FETCH_FAILED",
          details: levelsError.message,
        },
        { status: 500 }
      );
    }

    const levelCodes = levels?.map((level) => level.code) || [];

    const serviceInput = {
      service_type,
      devotion_type,
      name: serviceName,
      date: date, // Send as YYYY-MM-DD
      time: time, // Send as HH:mm
      applicable_levels: applicable_levels, // Send level IDs
      gender_constraint,
    };

    const service = new ServiceService();
    const result = await service.createService(serviceInput, admin.id);

    // Log admin action
    await logAdminAction(
      admin.id,
      `Created Service ${result.name || result.type}`,
      "service",
      result.id,
      result.name || result.type,
      {
        service_type,
        devotion_type,
        date: result.date,
        levels: result.levels,
        gender_constraint,
      }
    );

    // Workflow requires returning the created service record
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const status = error?.status || 500;
    const code =
      error?.code ||
      (status === 401
        ? "UNAUTHORIZED"
        : status === 403
        ? "FORBIDDEN"
        : "INTERNAL_ERROR");
    const message =
      status === 400 || status === 401 || status === 403
        ? error?.message || "Request failed"
        : "Internal server error";
    return NextResponse.json(
      { error: message, code, details: error?.details },
      { status }
    );
  }
}
