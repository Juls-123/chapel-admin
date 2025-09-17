import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const querySchema = z.object({
  upload_id: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { upload_id } = parsed.data;

    let query = supabaseAdmin
      .from("attendance_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (upload_id) {
      query = query.eq("attendance_upload_id", upload_id);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch attendance batches", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("Attendance batches fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch batches" },
      { status: 500 }
    );
  }
}
