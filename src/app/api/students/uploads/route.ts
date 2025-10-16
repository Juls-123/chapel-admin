import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/response";
import { StudentUploadService } from "@/services/StudentUploadService";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to standardize API responses
function buildResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

// Schema for query parameters
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
  uploader: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Schema for file upload
const fileSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z.number().int().min(1, "File cannot be empty"),
  type: z
    .string()
    .refine(
      (type) =>
        [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
        ].includes(type),
      { message: "Only Excel and CSV files are allowed" }
    ),
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

    let query = supabaseAdmin
      .from("student_uploads")
      .select(
        `id, storage_path, file_hash, uploaded_by, uploaded_at,
         uploader:admins!student_uploads_uploaded_by_fkey(id, first_name, last_name, email)`,
        { count: "exact" }
      )
      .order("uploaded_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(
        `file_hash.ilike.%${search}%,storage_path.ilike.%${search}%`
      );
    }

    if (uploader) {
      query = query.eq("uploaded_by", uploader);
    }

    if (date_from) {
      query = query.gte("uploaded_at", date_from);
    }
    if (date_to) {
      query = query.lte("uploaded_at", date_to);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        { 
          error: "Failed to fetch student uploads", 
          details: error.message 
        },
        { status: 500 }
      );
    }

    return buildResponse({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "students/uploads.GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin({ role: "superadmin" });
    const formData = await request.formData();

    // Get file from form data
    const fileEntry = formData.get("file");

    // Debug logging
    console.log("FormData keys:", Array.from(formData.keys()));
    console.log("File entry type:", typeof fileEntry);
    console.log("File entry instanceof File:", fileEntry instanceof File);

    // Validate file presence
    if (!fileEntry || !(fileEntry instanceof File)) {
      return buildResponse(
        { error: "Invalid file", details: ["A valid file is required"] },
        400
      );
    }

    const file = fileEntry;
    console.log("Processing file upload:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Validate file structure
    const fileValidation = fileSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!fileValidation.success) {
      return buildResponse(
        { error: "Invalid file", details: fileValidation.error.errors.map((e) => e.message) },
        400
      );
    }

    // Process file upload using service
    const uploadService = new StudentUploadService();
    const uploadResult = await uploadService.uploadStudentFile(file, admin.id);

    return buildResponse(
      {
        id: uploadResult.id,
        path: uploadResult.storagePath,
        hash: uploadResult.fileHash,
      },
      201
    );
  } catch (error) {
    console.error("Upload error:", error);
    return handleApiError(error, "students/uploads.POST");
  }
}
