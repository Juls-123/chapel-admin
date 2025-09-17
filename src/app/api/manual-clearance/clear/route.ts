import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";
import { ManualClearanceService } from "@/services/ManualClearanceService";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Schema that matches what frontend sends
const clearSchema = z.object({
  studentIds: z.array(z.string()).min(1, "At least one student is required"), // These are matric numbers
  serviceId: z.string().uuid("Invalid service ID"),
  level: z.string().uuid("Invalid level ID"), // This is a level UUID
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
  reasonId: z.string().uuid("Invalid reason ID"),
  clearedBy: z.string().uuid("Invalid admin ID"),
  comments: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const { admin } = await requireAdmin(request);

    // Parse and validate request body
    const body = await request.json();
    const validation = clearSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      studentIds: matricNumbers,
      serviceId,
      level: levelUuid,
      reasonId,
      clearedBy,
      comments,
    } = validation.data;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Step 1: Convert matric numbers to student UUIDs
    const { data: students, error: studentsError } = await supabaseAdmin
      .from("students")
      .select("id, matric_number, first_name, last_name")
      .in("matric_number", matricNumbers);

    if (studentsError || !students || students.length === 0) {
      return NextResponse.json(
        {
          error: "No valid students found",
          details: `Could not find students with provided matric numbers: ${matricNumbers.join(
            ", "
          )}`,
        },
        { status: 404 }
      );
    }

    // Check for missing students
    const foundMatricNumbers = students.map((s) => s.matric_number);
    const missingMatricNumbers = matricNumbers.filter(
      (m) => !foundMatricNumbers.includes(m)
    );

    if (missingMatricNumbers.length > 0) {
      console.warn(
        `Students not found for matric numbers: ${missingMatricNumbers.join(
          ", "
        )}`
      );
    }

    // Step 2: Convert level UUID to level code
    const { data: levelData, error: levelError } = await supabaseAdmin
      .from("levels")
      .select("code, name")
      .eq("id", levelUuid)
      .single();

    if (levelError || !levelData) {
      return NextResponse.json(
        {
          error: "Invalid level specified",
          details: `Could not find level with ID: ${levelUuid}`,
        },
        { status: 400 }
      );
    }

    // Step 3: Validate reason exists
    const { data: reasonData, error: reasonError } = await supabaseAdmin
      .from("override_reason_definitions")
      .select("id, display_name, requires_note")
      .eq("id", reasonId)
      .single();

    if (reasonError) {
      console.error("Error fetching reason:", reasonError);
      return NextResponse.json(
        {
          error: "Database error",
          details: "Failed to fetch reason details",
        },
        { status: 500 }
      );
    }

    if (!reasonData) {
      return NextResponse.json(
        {
          error: "Invalid reason specified",
          details: `Could not find reason with ID: ${reasonId}`,
        },
        { status: 400 }
      );
    }

    // Check if reason requires comments
    if (
      reasonData.requires_note &&
      (!comments || comments.trim().length === 0)
    ) {
      return NextResponse.json(
        {
          error: "Comments required",
          details: `The selected reason "${reasonData.display_name}" requires additional comments`,
        },
        { status: 400 }
      );
    }

    // Step 4: Process each student's clearance using the service
    const results = [];
    const errors = [];

    for (const student of students) {
      try {
        const result = await ManualClearanceService.clearStudent({
          studentId: student.id, // Now using actual UUID
          serviceId,
          level: levelData.code, // Now using level code (e.g., "100", "200")
          reasonId,
          adminId: clearedBy,
          comments,
          ipAddress,
        });

        results.push({
          studentId: student.id,
          matricNumber: student.matric_number,
          studentName: `${student.first_name} ${student.last_name}`.trim(),
          success: true,
          data: result,
        });
      } catch (error) {
        console.error(
          `Error clearing student ${student.matric_number} (${student.id}):`,
          error
        );
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({
          studentId: student.id,
          matricNumber: student.matric_number,
          studentName: `${student.first_name} ${student.last_name}`.trim(),
          error: errorMessage,
        });
      }
    }

    // Step 5: Prepare comprehensive response
    const response = {
      success: results.length > 0,
      message:
        results.length > 0
          ? `Successfully cleared ${results.length} student${
              results.length > 1 ? "s" : ""
            }`
          : "Failed to clear any students",
      cleared_count: results.length,
      failed_count: errors.length,
      total_requested: matricNumbers.length,
      total_found: students.length,
      results,
      ...(errors.length > 0 && { errors }),
      ...(missingMatricNumbers.length > 0 && {
        warnings: [`Students not found: ${missingMatricNumbers.join(", ")}`],
      }),
    };

    // Step 6: Return appropriate status code based on results
    if (errors.length > 0 && results.length === 0) {
      // All operations failed
      return NextResponse.json(
        {
          ...response,
          error: "Failed to clear any students",
        },
        { status: 400 }
      );
    } else if (errors.length > 0) {
      // Partial success
      return NextResponse.json(response, { status: 207 });
    }

    // Complete success
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in POST /api/manual-clearance/clear:", error);

    // Handle different types of errors
    let errorMessage = "An unknown error occurred";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check if it's a specific service error
      if (error.name === "ClearanceError") {
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process clearance request",
        details: errorMessage,
      },
      { status: statusCode }
    );
  }
}
