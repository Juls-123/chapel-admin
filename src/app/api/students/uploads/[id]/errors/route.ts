import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { buildResponse, handleApiError, failure } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const uploadId = await params.id;

    // Ensure upload exists in student_uploads
    const { data: upload, error: uploadError } = await supabase
      .from("student_uploads")
      .select("id")
      .eq("id", uploadId)
      .single();

    if (uploadError || !upload) {
      return failure({
        code: "NOT_FOUND",
        message: "Student upload not found",
        status: 404,
        details: uploadError?.message,
      });
    }

    // Fetch row-level errors from student_upload_errors
    const { data: errors, error } = await supabase
      .from("student_upload_errors")
      .select("id, row_number, error_type, error_message, raw_data, created_at")
      .eq("student_upload_id", uploadId)
      .order("row_number", { ascending: true });

    if (error) {
      throw Object.assign(new Error("Failed to fetch student upload errors"), {
        status: 500,
        code: "UPLOAD_ERRORS_FETCH_FAILED",
        details: error.message,
      });
    }

    return NextResponse.json(buildResponse({ data: errors || [] }));
  } catch (error) {
    return handleApiError(error, "students/uploads/:id/errors.GET");
  }
}
