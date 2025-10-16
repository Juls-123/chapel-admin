// src/app/api/absentees/services/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { ServicesQuerySchema } from "@/lib/utils/validators";
import { AbsenteesService, AbsenteeError } from "@/services/AbsenteesService";
import { StorageError } from "@/lib/utils/storage";

/**
 * GET /api/absentees/services?date=YYYY-MM-DD
 * Returns list of services for a date with absentee counts per level
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await requireAdmin();

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const result = ServicesQuerySchema.safeParse({
      date: searchParams.get("date"),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: result.error.format(),
        },
        { status: 400 }
      );
    }

    const { date } = result.data;

    // Fetch services with absentee counts
    const services = await AbsenteesService.getServicesWithCounts(date);

    return NextResponse.json({
      success: true,
      data: services,
      meta: {
        date,
        count: services.length,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/absentees/services:", error);

    // Handle specific error types
    if (error instanceof AbsenteeError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.code === "SERVICE_NOT_FOUND" ? 404 : 500 }
      );
    }

    if (error instanceof StorageError) {
      return NextResponse.json(
        {
          error: "Storage operation failed",
          code: error.code,
          details: error.details,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: "Failed to fetch services",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}