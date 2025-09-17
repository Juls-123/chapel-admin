import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";

// Use service role key for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createSemesterSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  })
  .refine((data) => new Date(data.start_date) < new Date(data.end_date), {
    message: "Start date must be before end date",
    path: ["end_date"],
  });

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    // Fetch semesters ordered by start_date desc (most recent first)
    const { data, error } = await supabaseAdmin
      .from("semesters")
      .select("*")
      .order("start_date", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch semesters",
          code: "DB_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
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
        details: error?.details,
      },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request, { role: "superadmin" });

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createSemesterSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, start_date, end_date } = validationResult.data;

    // Check for overlapping semesters
    const { data: existingSemesters, error: checkError } = await supabaseAdmin
      .from("semesters")
      .select("id, name, start_date, end_date")
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`);

    if (checkError) {
      return NextResponse.json(
        {
          error: "Failed to validate semester dates",
          code: "DB_ERROR",
          details: checkError.message,
        },
        { status: 500 }
      );
    }

    if (existingSemesters && existingSemesters.length > 0) {
      return NextResponse.json(
        {
          error: "Semester dates overlap with existing semester(s)",
          code: "CONFLICT",
          overlapping: existingSemesters.map((s: any) => s.name),
        },
        { status: 409 }
      );
    }

    // Create new semester
    const { data: newSemester, error: insertError } = await supabaseAdmin
      .from("semesters")
      .insert({
        name,
        start_date,
        end_date,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Semester name already exists", code: "CONFLICT" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to create semester",
          code: "DB_ERROR",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(newSemester, { status: 201 });
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
        details: error?.details,
      },
      { status }
    );
  }
}
