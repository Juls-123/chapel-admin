import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { buildResponse, handleApiError, failure } from "@/lib/api/response";

// Route: GET /api/students/[id]/attendance

// Helper method to load JSON from storage
async function loadJSONFromStorage(path: string): Promise<any[]> {
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const bucket = process.env.SUPABASE_ATTENDANCE_BUCKET || "attendance-scans";
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);

  if (error) {
    console.warn(`Failed to load JSON from ${path}: ${error.message}`);
    return [];
  }

  try {
    const text = await data.text();
    return JSON.parse(text);
  } catch (parseError) {
    console.warn(`Failed to parse JSON from ${path}:`, parseError);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First verify the student exists
    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, matric_number, first_name, last_name")
      .eq("id", params.id)
      .single();

    if (studentError || !student) {
      return failure({
        code: "NOT_FOUND",
        message: "Student not found",
        status: 404,
        details: studentError?.message,
      });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const serviceId = url.searchParams.get("service_id");
    const status = url.searchParams.get("status"); // 'present', 'absent'
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    const offset = (page - 1) * limit;

    // Build query to get attendance batches with service information
    let query = supabaseAdmin
      .from("attendance_batches")
      .select(
        `
        id,
        version_number,
        attendees_path,
        absentees_path,
        created_at,
        attendance_uploads!inner(
          id,
          service_id,
          level_id,
          uploaded_by,
          uploaded_at,
          services!inner(
            id,
            name,
            service_type,
            devotion_type,
            service_date,
            service_time
          ),
          levels(code, name)
        )
      `
      )
      .order("attendance_uploads.services.service_date", { ascending: false })
      .order("created_at", { ascending: false });

    // Apply service filter
    if (serviceId) {
      query = query.eq("attendance_uploads.service_id", serviceId);
    }

    // Apply date filters
    if (startDate) {
      query = query.gte("attendance_uploads.services.service_date", startDate);
    }

    if (endDate) {
      query = query.lte("attendance_uploads.services.service_date", endDate);
    }

    const { data: batches, error: batchError } = await query;

    if (batchError) {
      throw Object.assign(new Error("Failed to fetch attendance batches"), {
        status: 500,
        code: "BATCH_FETCH_FAILED",
        details: batchError.message,
      });
    }

    // Process batches to find student attendance records
    const attendanceRecords: any[] = [];

    for (const batch of batches || []) {
      try {
        // Load attendees and absentees from storage
        const [attendeesData, absenteesData] = await Promise.all([
          loadJSONFromStorage(batch.attendees_path),
          loadJSONFromStorage(batch.absentees_path),
        ]);

        // Check if student is in attendees
        const attendeeRecord = attendeesData.find(
          (attendee: any) => attendee.student_id === params.id
        );

        // Check if student is in absentees
        const absenteeRecord = absenteesData.find(
          (absentee: any) => absentee.student_id === params.id
        );

        // Create attendance record if student is found
        if (attendeeRecord || absenteeRecord) {
          const service = batch.attendance_uploads?.services;
          const level = batch.attendance_uploads?.levels;
          const isPresent = !!attendeeRecord;

          // Apply status filter
          if (
            status &&
            ((status === "present" && !isPresent) ||
              (status === "absent" && isPresent))
          ) {
            continue;
          }

          const record = {
            id: `${batch.id}-${params.id}`,
            student_id: params.id,
            service_id: service?.id,
            batch_id: batch.id,
            status: isPresent ? "present" : "absent",
            marked_at: batch.created_at,
            marked_by: batch.attendance_uploads?.uploaded_by,
            notes: null,
            service_name:
              service?.name ||
              (service?.service_type === "devotion"
                ? `${
                    service.devotion_type === "evening" ? "Evening" : "Morning"
                  } Devotion`
                : "Special Service"),
            service_type: service?.service_type,
            service_date: service?.service_date,
            service_time: service?.service_time,
            level_code: level?.code,
            level_name: level?.name,
          };

          attendanceRecords.push(record);
        }
      } catch (storageError) {
        console.warn(
          `Failed to load attendance data for batch ${batch.id}:`,
          storageError
        );
        continue;
      }
    }

    // Apply pagination
    const totalCount = attendanceRecords.length;
    const paginatedRecords = attendanceRecords.slice(offset, offset + limit);

    return NextResponse.json(
      buildResponse({
        data: {
          student: {
            id: student.id,
            matric_number: student.matric_number,
            name: `${student.first_name} ${student.last_name}`,
          },
          records: paginatedRecords,
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      })
    );
  } catch (error) {
    return handleApiError(error, "students/:id/attendance.GET");
  }
}
