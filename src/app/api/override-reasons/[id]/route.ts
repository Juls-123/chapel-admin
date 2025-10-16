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

const updateOverrideReasonSchema = z.object({
  display_name: z.string().min(1, "Display name is required").optional(),
  description: z.string().optional(),
  requires_note: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin({ role: "superadmin" });

    const body = await request.json();

    // Validate the request data
    const validationResult = updateOverrideReasonSchema.safeParse(body);
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

    const { data: updatedReason, error: updateError } = await supabaseAdmin
      .from("override_reason_definitions")
      .update(validationResult.data)
      .eq("id", params.id)
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

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Override reason not found", code: "NOT_FOUND" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to update override reason",
          code: "DB_ERROR",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // Transform response
    const transformedData = {
      ...updatedReason,
      created_by_name:
        updatedReason.admins &&
        Array.isArray(updatedReason.admins) &&
        updatedReason.admins.length > 0
          ? `${updatedReason.admins[0].first_name} ${updatedReason.admins[0].last_name}`
          : "System",
      admins: undefined,
    };

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin({ role: "superadmin" });

    // Hard delete the override reason
    const { data: deletedReason, error: deleteError } = await supabaseAdmin
      .from("override_reason_definitions")
      .delete()
      .eq("id", params.id)
      .select("id, display_name")
      .single();

    if (deleteError) {
      if (deleteError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Override reason not found",
            code: "NOT_FOUND",
            details:
              "The specified override reason does not exist or has already been deleted.",
          },
          { status: 404 }
        );
      }
      if (deleteError.code === "23503") {
        return NextResponse.json(
          {
            error: "Cannot delete override reason",
            code: "CONFLICT",
            details:
              "This override reason is currently being used and cannot be deleted. Please remove all references first.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: "Failed to delete override reason",
          code: "DB_ERROR",
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Override reason "${deletedReason.display_name}" has been permanently deleted`,
    });
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
