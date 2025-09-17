import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { adminSchema } from "@/lib/validation/admins.schema";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { admin } = await requireAdmin(request);

    // Get admin profile from database (by admin id)
    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("*")
      .eq("id", admin.id)
      .single();

    if (adminError) {
      return NextResponse.json(
        {
          error: "Profile not found",
          code: "NOT_FOUND",
          details: adminError.message,
        },
        { status: 404 }
      );
    }

    // Validate the admin data
    const validationResult = adminSchema.safeParse(adminRow);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid profile data",
          code: "INVALID_DATA",
          details: validationResult.error.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
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

export async function PUT(request: NextRequest) {
  try {
    const { admin } = await requireAdmin(request, { role: "superadmin" });

    const body = await request.json();

    // Validate the update data
    const allowedFields = ["first_name", "middle_name", "last_name"];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Update the admin profile
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from("admins")
      .update(updateData)
      .eq("id", admin.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to update profile",
          code: "DB_ERROR",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // Validate the updated admin data
    const validationResult = adminSchema.safeParse(updatedAdmin);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid updated profile data",
          code: "INVALID_DATA",
          details: validationResult.error.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
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
