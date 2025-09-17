import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { AttendanceService } from "@/services/AttendanceService";
import { z } from "zod";

const processSchema = z.object({
  uploadId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const validation = processSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { uploadId } = validation.data;
    const attendanceService = new AttendanceService();

    // Process the uploaded file
    const preview = await attendanceService.processAttendanceFile(uploadId);

    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    console.error("Attendance processing error:", error);
    return NextResponse.json(
      { error: error.message || "Processing failed" },
      { status: 500 }
    );
  }
}
