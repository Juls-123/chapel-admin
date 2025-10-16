import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AttendanceRecord {
  unique_id: string;
  level: string | number;
  gender: string;
  student_id: string;
  matric_number: string;
  student_name: string;
  status: "present" | "absent";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const resolvedParams = await params;
    const serviceId = resolvedParams.id;

    const { searchParams } = new URL(request.url);
    const levelCode = searchParams.get("level_code");

    if (!levelCode) {
      return NextResponse.json(
        { error: "Level code required" },
        { status: 400 }
      );
    }

    // Get the level details first
    const { data: level, error: levelError } = await supabase
      .from("levels")
      .select("id, code, name")
      .eq("code", levelCode)
      .single();

    if (levelError || !level) {
      return NextResponse.json({ error: "Level not found" }, { status: 404 });
    }

    // Get the latest attendance upload using correct schema
    const { data: attendanceUploads, error: uploadError } = await supabase
      .from("attendance_uploads")
      .select("id, uploaded_at, storage_path")
      .eq("service_id", serviceId)
      .eq("level_id", level.id)
      .order("uploaded_at", { ascending: false })
      .limit(1);

    if (uploadError) {
      console.error("Attendance upload query error:", uploadError);
      return NextResponse.json(
        { error: "Failed to fetch attendance upload" },
        { status: 500 }
      );
    }

    if (!attendanceUploads || attendanceUploads.length === 0) {
      return NextResponse.json({
        message: "No attendance data found for this service and level",
        data: {
          service_id: serviceId,
          level_code: levelCode,
          attendance: [],
          summary: {
            total_students: 0,
            present: 0,
            absent: 0,
            exempted: 0,
            percentage: 0,
          },
        },
      });
    }

    const latestUpload = attendanceUploads[0];

    // Get the latest batch for this upload
    console.log("🔍 Fetching attendance batches...");
    const { data: batches, error: batchError } = await supabase
      .from("attendance_batches")
      .select(
        "id, attendees_path, absentees_path, exempted_path, version_number, created_at"
      )
      .eq("attendance_upload_id", latestUpload.id)
      .order("version_number", { ascending: false })
      .limit(1);

    if (batchError) {
      console.error("Batch query error:", batchError);
      return NextResponse.json(
        { error: "Failed to fetch attendance batch" },
        { status: 500 }
      );
    }

    if (!batches || batches.length === 0) {
      return NextResponse.json({
        message: "No processed attendance batch found",
        data: {
          service_id: serviceId,
          level_code: levelCode,
          attendance: [],
          summary: {
            total_students: 0,
            present: 0,
            absent: 0,
            exempted: 0,
            percentage: 0,
          },
        },
      });
    }

    const latestBatch = batches[0];

    // Read attendees, absentees, exempted, and manually cleared JSON files from storage
    let attendees: any[] = [];
    let absentees: any[] = [];
    let exempted: any[] = [];
    let manuallyCleared: any[] = []; // NEW: Add manually cleared students

    try {
      // Download attendees file
      if (latestBatch.attendees_path) {
        const { data: attendeesData, error: attendeesError } =
          await supabase.storage
            .from("attendance-scans")
            .download(latestBatch.attendees_path);

        if (!attendeesError && attendeesData) {
          const attendeesText = await attendeesData.text();
          attendees = JSON.parse(attendeesText);
        }
      }

      // Download absentees file
      if (latestBatch.absentees_path) {
        const { data: absenteesData, error: absenteesError } =
          await supabase.storage
            .from("attendance-scans")
            .download(latestBatch.absentees_path);

        if (!absenteesError && absenteesData) {
          const absenteesText = await absenteesData.text();
          absentees = JSON.parse(absenteesText);
        }
      }

      // Download exempted file if it exists
      if (latestBatch.exempted_path) {
        const { data: exemptedData, error: exemptedError } =
          await supabase.storage
            .from("attendance-scans")
            .download(latestBatch.exempted_path);

        if (!exemptedError && exemptedData) {
          const exemptedText = await exemptedData.text();
          exempted = JSON.parse(exemptedText);
        }
      }

      // NEW: Download manually cleared file
      // Construct the path based on service date and storage structure
      const { data: serviceData } = await supabase
        .from("services")
        .select("service_date")
        .eq("id", serviceId)
        .single();

      if (serviceData) {
        const dateStr = new Date(serviceData.service_date)
          .toISOString()
          .split("T")[0];
        const clearedPath = `attendance/${dateStr}/${serviceId}/${levelCode}/manually_cleared.json`;

        const { data: clearedData, error: clearedError } =
          await supabase.storage.from("attendance-scans").download(clearedPath);

        if (!clearedError && clearedData) {
          const clearedText = await clearedData.text();
          const clearedRecords = JSON.parse(clearedText);

          // Transform the manually cleared records to match attendance format
          manuallyCleared = clearedRecords.map((record: any) => ({
            student_id: record.student_id,
            matric_number: record.matric_number,
            student_name: record.student_name,
            gender: record.gender,
            level: record.level,
            level_id: record.level_id,
            unique_id: record.matric_number, // Use matric as unique_id
            // Add clearance reason from the nested structure
            reason: record.clearance?.reason || "Manually cleared",
          }));

          console.log(
            `📋 Found ${manuallyCleared.length} manually cleared students`
          );
        } else {
          console.log("📋 No manually cleared file found (this is normal)");
        }
      }
    } catch (jsonError) {
      console.error("Error parsing JSON files:", jsonError);
      return NextResponse.json(
        { error: "Failed to parse attendance data" },
        { status: 500 }
      );
    }

    // Combine attendees, absentees, exempted, and manually cleared into a single attendance array
    const attendance = [
      ...attendees.map((student: any) => ({
        ...student,
        status: "present",
      })),
      ...absentees.map((student: any) => ({
        ...student,
        status: "absent",
      })),
      ...exempted.map((student: any) => ({
        ...student,
        status: "exempted",
      })),
      // NEW: Add manually cleared students as exempted
      ...manuallyCleared.map((student: any) => ({
        ...student,
        status: "exempted",
        // Keep the clearance reason
      })),
    ];

    // Sort by student ID for consistent ordering
    attendance.sort((a, b) => {
      const aId = a.student_id || a.id || "";
      const bId = b.student_id || b.id || "";
      return aId.localeCompare(bId);
    });

    // Calculate summary statistics (updated to include manually cleared)
    const totalStudents = attendance.length;
    const presentCount = attendees.length;
    const absentCount = absentees.length;
    const exemptedCount = exempted.length + manuallyCleared.length; // Include manually cleared
    const percentage =
      totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    console.log(
      `📊 Attendance Summary: ${presentCount} present, ${absentCount} absent, ${exemptedCount} exempted (${manuallyCleared.length} manually cleared), ${totalStudents} total`
    );

    return NextResponse.json({
      success: true,
      data: {
        service_id: serviceId,
        level_code: levelCode,
        level_name: level.name,
        uploaded_at: latestUpload.uploaded_at,
        batch_version: latestBatch.version_number,
        processed_at: latestBatch.created_at,
        attendance,
        summary: {
          total_students: totalStudents,
          present: presentCount,
          absent: absentCount,
          exempted: exemptedCount,
          percentage,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const resolvedParams = await params;
    const serviceId = resolvedParams.id;

    const body = await request.json();
    const { level_code, attendees, absentees, uploaded_by } = body;

    if (!level_code || !Array.isArray(attendees) || !Array.isArray(absentees)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    if (!uploaded_by) {
      return NextResponse.json(
        { error: "uploaded_by is required" },
        { status: 400 }
      );
    }

    // Get the level details
    const { data: level, error: levelError } = await supabase
      .from("levels")
      .select("id")
      .eq("code", level_code)
      .single();

    if (levelError || !level) {
      return NextResponse.json({ error: "Level not found" }, { status: 404 });
    }

    // Generate file paths
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const timestamp = Date.now();
    const basePath = `attendance/${today}/${serviceId}/${level_code}`;

    const attendeesPath = `${basePath}/attendees_${timestamp}.json`;
    const absenteesPath = `${basePath}/absentees_${timestamp}.json`;

    // Upload JSON files to storage
    const { error: attendeesUploadError } = await supabase.storage
      .from("attendance-scans")
      .upload(attendeesPath, JSON.stringify(attendees, null, 2), {
        contentType: "application/json",
      });

    if (attendeesUploadError) {
      console.error("Attendees upload error:", attendeesUploadError);
      return NextResponse.json(
        { error: "Failed to upload attendees data" },
        { status: 500 }
      );
    }

    const { error: absenteesUploadError } = await supabase.storage
      .from("attendance-scans")
      .upload(absenteesPath, JSON.stringify(absentees, null, 2), {
        contentType: "application/json",
      });

    if (absenteesUploadError) {
      console.error("Absentees upload error:", absenteesUploadError);
      return NextResponse.json(
        { error: "Failed to upload absentees data" },
        { status: 500 }
      );
    }

    // Create attendance upload record
    const fileHash = `manual-${timestamp}`;
    const { data: upload, error: uploadError } = await supabase
      .from("attendance_uploads")
      .insert({
        service_id: serviceId,
        level_id: level.id,
        file_hash: fileHash,
        storage_path: basePath,
        uploaded_by: uploaded_by,
        uploaded_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (uploadError || !upload) {
      console.error("Upload creation error:", uploadError);
      return NextResponse.json(
        { error: "Failed to create attendance upload record" },
        { status: 500 }
      );
    }

    // Create attendance batch record
    const { data: batch, error: batchError } = await supabase
      .from("attendance_batches")
      .insert({
        attendance_upload_id: upload.id,
        version_number: 1,
        raw_path: "", // Not applicable for manual uploads
        attendees_path: attendeesPath,
        absentees_path: absenteesPath,
        issues_path: "", // No issues for manual uploads
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      console.error("Batch creation error:", batchError);
      return NextResponse.json(
        { error: "Failed to create attendance batch record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance uploaded successfully",
      data: {
        upload_id: upload.id,
        batch_id: batch.id,
        service_id: serviceId,
        level_code,
        attendees_count: attendees.length,
        absentees_count: absentees.length,
        total_students: attendees.length + absentees.length,
      },
    });
  } catch (error) {
    console.error("Error uploading attendance:", error);
    return NextResponse.json(
      { error: "Failed to upload attendance" },
      { status: 500 }
    );
  }
}
