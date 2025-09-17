import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildResponse, handleApiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/api/auth";
import { parseStudentQuery } from "@/lib/api/parsers/students";
import { StudentService } from "@/services/StudentService";
import type { Database } from "@/lib/types/generated";

// Use service role key for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createStudentSchema = z.object({
  matric_number: z.string().min(1, "Matriculation number is required"),
  first_name: z.string().min(1, "First name is required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  parent_email: z.string().email("Invalid parent email address"),
  parent_phone: z.string().min(1, "Parent phone is required"),
  level: z.number().int().min(100).max(500),
  gender: z.enum(["male", "female"]),
  department: z.string().min(1, "Department is required"),
});

const bulkCreateStudentsSchema = z.array(createStudentSchema);

const uploadMetadataSchema = z
  .object({
    student_upload_id: z.string().uuid(),
    fileName: z.string().optional(),
    fileSize: z.number().optional(),
  })
  .optional();

export async function GET(request: NextRequest) {
  try {
    // Auth: require any admin (admin or superadmin)
    await requireAdmin(request);

    // Parse query and delegate to service layer
    const { page, limit, search, matric, level, status, department } =
      parseStudentQuery(request);
    const service = new StudentService();
    const { items, total } = await service.list({
      page,
      limit,
      search,
      matric,
      level,
      status,
      department,
    });

    return NextResponse.json(
      buildResponse({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    return handleApiError(error, "students.GET");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth: superadmin required for mutations
    const { admin } = await requireAdmin(request, { role: "superadmin" });

    // Parse and validate request body
    const body = await request.json();

    // Extract upload metadata if present (for bulk uploads)
    const {
      students: bulkStudentsData,
      uploadMetadata,
      ...singleStudentData
    } = body || {};
    const isBulk = !!bulkStudentsData || Array.isArray(body);
    const actualData = isBulk ? bulkStudentsData || body : singleStudentData;

    // Validate upload metadata for bulk operations
    let validatedUploadMetadata:
      | Database["public"]["Tables"]["student_uploads"]["Row"]
      | undefined;
    if (isBulk && uploadMetadata) {
      const metadataValidation = uploadMetadataSchema.safeParse(uploadMetadata);
      if (!metadataValidation.success) {
        return NextResponse.json(
          {
            error: "Invalid upload metadata",
            details: metadataValidation.error.errors,
          },
          { status: 400 }
        );
      }

      // Verify the upload record exists and belongs to this admin
      const { data: uploadRecord, error: uploadError } = await supabaseAdmin
        .from("student_uploads")
        .select("*")
        .eq("id", metadataValidation.data!.student_upload_id)
        .eq("uploaded_by", admin.id)
        .single();

      if (uploadError || !uploadRecord) {
        return NextResponse.json(
          {
            error: "Invalid or unauthorized upload reference",
            details: uploadError?.message,
          },
          { status: 403 }
        );
      }

      validatedUploadMetadata = uploadRecord;
    }

    const validationResult = isBulk
      ? z.array(createStudentSchema).safeParse(actualData)
      : createStudentSchema.safeParse(actualData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const service = new StudentService();

    if (isBulk) {
      const inputs = validationResult.data as z.infer<
        typeof createStudentSchema
      >[];

      // Pass upload metadata to service for proper logging
      const uploadMetadataForService = validatedUploadMetadata
        ? {
            student_upload_id: validatedUploadMetadata.id,
            fileName: validatedUploadMetadata.storage_path.split("/").pop(),
            fileSize: undefined, // Could be added to student_uploads table if needed
          }
        : undefined;

      const { results, errors, duplicates, finalStatus } =
        await service.bulkCreate(
          inputs as any,
          admin.id,
          uploadMetadataForService
        );

      const successCount = results.length;
      const errorCount = errors.length;
      const duplicateCount = duplicates.length;

      return NextResponse.json(
        buildResponse({
          data: results,
          summary: {
            total_processed: successCount + errorCount + duplicateCount,
            successful: successCount,
            errors: errorCount,
            duplicates: duplicateCount,
            duplicate_details: duplicates,
            error_details: errors,
            status: finalStatus,
            upload_id: validatedUploadMetadata?.id,
          },
        })
      );
    } else {
      const input = validationResult.data as z.infer<
        typeof createStudentSchema
      >;
      const result = await service.createSingle(input as any, admin.id);

      const responseData =
        result.duplicate && result.action === "skipped"
          ? undefined
          : result.student;

      return NextResponse.json(buildResponse({ data: responseData }));
    }
  } catch (error) {
    return handleApiError(error, "students.POST");
  }
}
