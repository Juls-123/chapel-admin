import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { AttendanceService } from "@/services/AttendanceService";
import { z } from "zod";

const uploadSchema = z.object({
  serviceId: z.string().uuid(),
  levelId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const { admin } = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const serviceId = formData.get("serviceId") as string;
    const levelId = formData.get("levelId") as string;

    if (!file || !serviceId || !levelId) {
      return NextResponse.json(
        { error: "Missing required fields: file, serviceId, levelId" },
        { status: 400 }
      );
    }

    // Validate input
    const validation = uploadSchema.safeParse({ serviceId, levelId });
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const attendanceService = new AttendanceService();

    // Upload file
    const uploadResult = await attendanceService.uploadAttendanceFile({
      serviceId,
      levelId,
      file,
      uploadedBy: admin.id,
    });

    return NextResponse.json({
      success: true,
      data: uploadResult,
    });
  } catch (error: any) {
    console.error("Attendance upload error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
