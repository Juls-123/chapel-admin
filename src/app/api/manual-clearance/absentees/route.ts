import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "attendance-scans";

const querySchema = z.object({
  serviceId: z.string().uuid("Invalid service ID"),
  level: z.string().min(1, "Level is required"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const result = querySchema.safeParse({
      serviceId: searchParams.get("serviceId"),
      level: searchParams.get("level"),
      date: searchParams.get("date"),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.format() },
        { status: 400 }
      );
    }

    const { serviceId, level, date } = result.data;

    // 1. Verify service exists
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("id, service_date")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // 2. Convert level UUID to level code if needed
    let levelCode = level;
    if (level.length > 10 && level.includes("-")) {
      // If it's a UUID
      const { data: levelData, error: levelError } = await supabaseAdmin
        .from("levels")
        .select("code")
        .eq("id", level)
        .single();

      if (levelError) {
        return NextResponse.json(
          { error: "Invalid level specified" },
          { status: 400 }
        );
      }

      levelCode = levelData.code;
    }

    // 3. Build storage path and download absentees file
    const basePath = `attendance/${date}/${serviceId}/${levelCode}`;
    const absenteesPath = `${basePath}/absentees.json`;

    console.log(`Attempting to download: ${absenteesPath}`);

    try {
      const { data: absenteesData, error: absenteesError } =
        await supabaseAdmin.storage.from(BUCKET).download(absenteesPath);

      if (absenteesError) {
        console.error("Storage download error:", absenteesError);

        if (
          absenteesError.message?.includes("not found") ||
          absenteesError.message?.includes("Object not found")
        ) {
          // No absentees file means no absences for this service/level
          return NextResponse.json([]);
        }

        console.error(
          "Full storage error:",
          JSON.stringify(absenteesError, null, 2)
        );

        return NextResponse.json(
          {
            error: "Failed to access attendance data",
            details: `Storage error: ${absenteesError.message}`,
            path: absenteesPath,
          },
          { status: 500 }
        );
      }

      // 4. Parse and return absentees data directly
      const absenteesText = await absenteesData.text();
      const absentStudents = JSON.parse(absenteesText);

      // 5. Format response (keep the existing format for consistency)
      const formattedStudents = absentStudents.map((student: any) => ({
        matric_number: student.matric_number || "",
        student_name: student.student_name || "",
        level: level, // Use the requested level
      }));

      return NextResponse.json(formattedStudents);
    } catch (storageError) {
      console.error("Storage error:", storageError);

      if (storageError instanceof SyntaxError) {
        return NextResponse.json(
          {
            error: "Invalid attendance data format",
            details: "The stored attendance file is corrupted or invalid",
          },
          { status: 500 }
        );
      }

      throw storageError;
    }
  } catch (error) {
    console.error("Error in GET /api/manual-clearance/absentees:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch absent students",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
