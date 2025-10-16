import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const resolvedParams = await params;
    const studentId = resolvedParams.id;

    // Fetch student details with level
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(`
        id,
        matric_number,
        first_name,
        middle_name,
        last_name,
        full_name,
        email,
        parent_email,
        parent_phone,
        gender,
        department,
        status,
        created_at,
        updated_at,
        levels!students_level_id_fkey(code, name)
      `)
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        {
          error: "Student not found",
          details: studentError?.message,
        },
        { status: 404 }
      );
    }

    // Transform the student data
    const studentData = {
      ...student,
      level: student.levels?.code ? parseInt(student.levels.code) : null,
      level_name: student.levels?.name ?? null,
    };

    // Remove the levels object from the response
    delete (studentData as any).levels;

    return NextResponse.json({
      success: true,
      data: studentData
    });

  } catch (error) {
    console.error("Error in GET /api/students/[id]/profile:", error);
    
    return NextResponse.json(
      {
        error: "Failed to fetch student profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}