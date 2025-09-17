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
  uploader_id: z.string().uuid().optional(),
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

    const { page, limit, uploader_id } = parsed.data;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("attendance_uploads")
      .select(
        `
        id,
        service_id,
        level_id,
        file_hash,
        storage_path,
        uploaded_at,
        uploaded_by,
        uploader:uploaded_by(id, first_name, last_name, email),
        service:services(id, service_type, devotion_type, name, service_date, service_time),
        level:levels(id, code, name)
      `,
        { count: "exact" }
      )
      .order("uploaded_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (uploader_id) {
      query = query.eq("uploaded_by", uploader_id);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch attendance uploads",
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
    return handleApiError(error, "attendance-uploads");
  }
}
