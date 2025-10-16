import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { AttendanceService } from "@/services/AttendanceService";
import { z } from "zod";

const previewSchema = z.object({
  uploadId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin();

    const body = await request.json();
    const validation = previewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { uploadId } = validation.data;
    const attendanceService = new AttendanceService();

    // Generate preview with only unmatched records
    const previewResult = await attendanceService.previewAttendanceFile(
      uploadId
    );

    return NextResponse.json({
      success: true,
      data: previewResult,
    });
  } catch (error: any) {
    console.error("Attendance preview error:", error);
    return NextResponse.json(
      { error: error.message || "Preview failed" },
      { status: 500 }
    );
  }
}
