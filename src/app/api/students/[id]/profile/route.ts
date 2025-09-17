import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { buildResponse, failure, handleApiError } from "@/lib/api/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request); // any admin can view profiles

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const studentId = params.id;

    // Fetch student details with level
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(
        `
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
      `
      )
      .eq("id", studentId)
      .single();

    if (studentError || !student) {
      return failure({
        code: "NOT_FOUND",
        message: "Student not found",
        status: 404,
        details: studentError?.message,
      });
    }

    const studentTransformed = {
      ...student,
      level: (student as any).levels?.code
        ? parseInt((student as any).levels.code)
        : null,
      level_name: (student as any).levels?.name ?? null,
      levels: undefined,
    };

    // Fetch recent attendance (latest 10)
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select(
        `
        id,
        student_id,
        service_id,
        status,
        marked_at,
        services!attendance_service_id_fkey(id, name, type, date, start_time, end_time)
      `
      )
      .eq("student_id", studentId)
      .order("marked_at", { ascending: false })
      .limit(10);

    if (attendanceError) {
      throw Object.assign(new Error("Failed to fetch attendance"), {
        status: 500,
        code: "ATTENDANCE_FETCH_FAILED",
        details: attendanceError.message,
      });
    }

    const recentAttendance = (attendance || []).map((r: any) => ({
      id: r.id,
      service_id: r.service_id,
      status: r.status,
      marked_at: r.marked_at,
      service: r.services
        ? {
            id: r.services.id,
            name: r.services.name,
            type: r.services.type,
            date: r.services.date,
            start_time: r.services.start_time,
            end_time: r.services.end_time,
          }
        : null,
    }));

    // Count totals by status for the student
    const { count: totalPresent } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "present");

    const { count: totalAbsent } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "absent");

    const { count: totalExempted } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "exempted");

    // Fetch recent exeats (latest 10)
    const { data: exeats, error: exeatError } = await supabase
      .from("exeats")
      .select("id, start_date, end_date, reason, status, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (exeatError) {
      throw Object.assign(new Error("Failed to fetch exeats"), {
        status: 500,
        code: "EXEATS_FETCH_FAILED",
        details: exeatError.message,
      });
    }

    // Total exeats count
    const { count: totalExeats } = await supabase
      .from("exeats")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId);

    // Build response
    return NextResponse.json(
      buildResponse({
        data: {
          student: studentTransformed,
          attendance: {
            recent: recentAttendance,
            totals: {
              present: totalPresent || 0,
              absent: totalAbsent || 0,
              exempted: totalExempted || 0,
            },
          },
          exeats: {
            recent: exeats || [],
            total: totalExeats || 0,
          },
        },
      })
    );
  } catch (error) {
    return handleApiError(error, "students/:id/profile.GET");
  }
}
