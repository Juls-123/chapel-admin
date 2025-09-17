import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";
import { success, handleApiError } from "@/lib/api/response";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  resolved: z.coerce.boolean().optional(),
  service_id: z.string().uuid().optional(),
  level_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          code: "VALIDATION_ERROR",
          details: parsed.error.errors,
        },
        { status: 400 }
      );
    }

    const { page, limit, resolved } = parsed.data;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("attendance_issues")
      .select(
        `
        id,
        issue_type,
        issue_description,
        raw_data,
        resolved,
        resolved_at,
        resolved_by,
        created_at,
        student_id,
        attendance_batch_id,
        student:students(id, matric_number, first_name, last_name),
        attendance_batch:attendance_batches(
          id,
          version_number,
          attendance_upload_id,
          attendance_upload:attendance_uploads(
            service_id,
            level_id,
            service:services(id, service_type, name, service_date),
            level:levels(id, code, name)
          )
        )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (resolved !== undefined) {
      query = query.eq("resolved", resolved);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch attendance issues",
          code: "DATABASE_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return success(data || [], {
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    return handleApiError(error, "attendance-issues");
  }
}
