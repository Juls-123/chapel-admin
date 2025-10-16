import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { buildResponse, handleApiError } from "@/lib/api/response";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  search: z.string().optional(),
  uploader: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit, search, uploader, date_from, date_to } = parsed.data;
    const offset = (page - 1) * limit;

    // We select errors with contextual upload and uploader info
    let query = supabaseAdmin
      .from("student_upload_errors")
      .select(
        `id, row_number, error_type, error_message, raw_data, created_at,
         student_upload_id,
         upload:student_uploads!student_upload_errors_student_upload_id_fkey(id, uploaded_at, uploaded_by,
           uploader:admins!student_uploads_uploaded_by_fkey(id, first_name, last_name, email)
         )`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      // Search by error_message or raw_data JSON text or upload id
      query = query.or(
        `error_message.ilike.%${search}%,student_upload_id.ilike.%${search}%`
      );
    }

    if (uploader) {
      // filter via nested relation requires rpc or prefilter by joining via student_uploads; we can filter after fetch if needed
      // For performance, approximate by selecting all then filtering client-side would be heavy; instead, use a two-step approach to get upload ids by uploader
      const { data: uploadsByUploader } = await supabaseAdmin
        .from("student_uploads")
        .select("id")
        .eq("uploaded_by", uploader);
      const ids = (uploadsByUploader || []).map((u) => u.id);
      if (ids.length > 0) {
        query = query.in("student_upload_id", ids as string[]);
      } else {
        return NextResponse.json(
          buildResponse({
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          })
        );
      }
    }

    if (date_from) {
      query = query.gte("created_at", date_from);
    }
    if (date_to) {
      query = query.lte("created_at", date_to);
    }

    const { data, error, count } = await query;
    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch student issues", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      buildResponse({
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      })
    );
  } catch (error) {
    return handleApiError(error, "students/issues.GET");
  }
}
