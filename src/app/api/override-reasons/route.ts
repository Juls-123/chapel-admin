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

const overrideReasonSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  display_name: z.string(),
  description: z.string().nullable(),
  requires_note: z.boolean(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  is_active: z.boolean(),
});

const createOverrideReasonSchema = z.object({
  code: z.string().min(1, "Code is required"),
  display_name: z.string().min(1, "Display name is required"),
  description: z.string().optional(),
  requires_note: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active_only") === "true";

    let query = supabaseAdmin
      .from("override_reason_definitions")
      .select(
        `
        id,
        code,
        display_name,
        description,
        requires_note,
        created_by,
        created_at,
        is_active,
        admins!override_reason_definitions_created_by_fkey(first_name, last_name)
      `
      )
      .order("created_at", { ascending: false });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: "Failed to fetch override reasons",
          code: "DB_ERROR",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Transform data to include creator name
    const transformedData = data?.map((item) => ({
      ...item,
      created_by_name:
        item.admins && Array.isArray(item.admins) && item.admins.length > 0
          ? `${item.admins[0].first_name} ${item.admins[0].last_name}`
          : "System",
      admins: undefined, // Remove the nested object
    }));

    return NextResponse.json(transformedData);
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
    const { admin } = await requireAdmin({ role: "superadmin" });

    const body = await request.json();

    // Validate the request data
    const validationResult = createOverrideReasonSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid data",
          code: "VALIDATION_ERROR",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { data: newReason, error: insertError } = await supabaseAdmin
      .from("override_reason_definitions")
      .insert({
        ...validationResult.data,
        created_by: admin.id,
      })
      .select(
        `
        id,
        code,
        display_name,
        description,
        requires_note,
        created_by,
        created_at,
        is_active,
        admins!override_reason_definitions_created_by_fkey(first_name, last_name)
      `
      )
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: "Conflict: Code already exists",
            code: "CONFLICT",
            details: `An override reason with the code "${validationResult.data.code}" has been created before. Please use a different code.`,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to create override reason",
          code: "DB_ERROR",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // Transform response
    const transformedData = {
      ...newReason,
      created_by_name:
        newReason.admins &&
        Array.isArray(newReason.admins) &&
        newReason.admins.length > 0
          ? `${newReason.admins[0].first_name} ${newReason.admins[0].last_name}`
          : "System",
      admins: undefined,
    };

    return NextResponse.json(transformedData, { status: 201 });
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
