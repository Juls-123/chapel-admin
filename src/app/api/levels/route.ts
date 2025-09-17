import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";

// Use service role key for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    // Fetch all levels from the database
    const { data: levels, error: levelsError } = await supabaseAdmin
      .from("levels")
      .select("id, code, name, created_at")
      .order("code", { ascending: true });

    if (levelsError) {
      return NextResponse.json(
        {
          error: "Failed to fetch levels",
          code: "DB_ERROR",
          details: levelsError.message,
        },
        { status: 500 }
      );
    }

    // Return data matching database schema exactly
    return NextResponse.json(levels || []);
  } catch (error: any) {
    const status = error?.status || 500;
    const code =
      error?.code ||
      (status === 401
        ? "UNAUTHORIZED"
        : status === 403
        ? "FORBIDDEN"
        : "INTERNAL_ERROR");
    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
        code,
        details:
          error?.details ||
          "An unexpected error occurred while fetching levels",
      },
      { status }
    );
  }
}
