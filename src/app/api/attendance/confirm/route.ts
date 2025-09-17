import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { AttendanceService } from "@/services/AttendanceService";
import { z } from "zod";

const confirmSchema = z.object({
  uploadId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin(request);

    const body = await request.json();
    const validation = confirmSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { uploadId } = validation.data;
    const attendanceService = new AttendanceService();

    // Confirm attendance upload with transaction handling
    const confirmResult = await attendanceService.confirmAttendanceUpload(
      uploadId,
      admin.id
    );

    return NextResponse.json({
      success: true,
      data: {
        batchId: confirmResult.batchId,
        recordsProcessed: confirmResult.recordsProcessed,
        matchedCount: confirmResult.matchedCount,
        unmatchedCount: confirmResult.unmatchedCount,
      },
    });
  } catch (error: any) {
    console.error("Attendance confirmation error:", error);

    // Determine if error is retryable
    const isRetryable =
      !error.message.includes("not found") &&
      !error.message.includes("Invalid") &&
      !error.message.includes("parsing failed");

    return NextResponse.json(
      {
        error: error.message || "Confirmation failed",
        canRetry: isRetryable,
      },
      { status: 500 }
    );
  }
}
