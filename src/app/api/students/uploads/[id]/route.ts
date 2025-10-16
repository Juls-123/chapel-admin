import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { buildResponse, handleApiError, failure } from "@/lib/api/response";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const querySchema = z.object({ include_url: z.coerce.boolean().optional() });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    const includeUrl = parsed.success ? parsed.data.include_url : false;

    const { id } = params;

    const { data: upload, error } = await supabaseAdmin
      .from("student_uploads")
      .select(
        `id, storage_path, file_hash, uploaded_by, uploaded_at,
         uploader:admins!student_uploads_uploaded_by_fkey(id, first_name, last_name, email)`
      )
      .eq("id", id)
      .single();

    if (error || !upload) {
      return failure({
        code: "NOT_FOUND",
        message: "Student upload not found",
        status: 404,
        details: error?.message,
      });
    }

    // Fetch error count for quick summary
    const { count: errorCount } = await supabaseAdmin
      .from("student_upload_errors")
      .select("id", { count: "exact", head: true })
      .eq("student_upload_id", id);

    let signedUrl: string | null = null;
    if (includeUrl && upload.storage_path) {
      // Derive bucket from path convention if needed. Assuming single bucket env var.
      const bucket =
        process.env.NEXT_PUBLIC_STUDENTS_UPLOADS_BUCKET || "students-uploads";
      const storage = supabaseAdmin.storage.from(bucket);
      const { data: urlData, error: urlErr } = await storage.createSignedUrl(
        upload.storage_path,
        60 * 10
      ); // 10 min
      if (!urlErr) signedUrl = urlData?.signedUrl ?? null;
    }

    return NextResponse.json(
      buildResponse({
        data: {
          ...upload,
          error_count: errorCount || 0,
          signed_url: signedUrl,
        },
      })
    );
  } catch (error) {
    return handleApiError(error, "students/uploads/:id.GET");
  }
}
