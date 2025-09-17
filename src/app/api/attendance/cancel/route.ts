import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { AttendanceService } from "@/services/AttendanceService";
import { z } from "zod";

const cancelSchema = z.object({
  uploadId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const body = await request.json();
    const validation = cancelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { uploadId } = validation.data;
    const attendanceService = new AttendanceService();

    // Cancel the upload
    await attendanceService.cancelAttendanceUpload(uploadId, user.id);

    return NextResponse.json({
      success: true,
      message: "Upload cancelled successfully",
    });
  } catch (error: any) {
    console.error("Attendance cancellation error:", error);
    return NextResponse.json(
      { error: error.message || "Cancellation failed" },
      { status: 500 }
    );
  }
}
