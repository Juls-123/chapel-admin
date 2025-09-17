import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { z } from "zod";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const querySchema = z.object({
  service_id: z.string().uuid(),
  level_id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const validation = querySchema.safeParse({
      service_id: searchParams.get("service_id"),
      level_id: searchParams.get("level_id"),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { service_id, level_id } = validation.data;

    // Fetch active students for the specified level
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select(
        `
        id,
        matric_number,
        first_name,
        last_name
      `
      )
      .eq("level_id", level_id)
      .eq("status", "active")
      .order("matric_number");

    if (error) {
      console.error("Failed to fetch students:", error);
      return NextResponse.json(
        { error: "Failed to fetch students" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: students || [],
    });
  } catch (error: any) {
    console.error("Attendance students API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
