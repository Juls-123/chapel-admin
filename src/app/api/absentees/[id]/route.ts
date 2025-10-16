// src/app/api/absentees/[serviceId]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import {
  AbsenteesQuerySchema,
  ServiceIdParamSchema,
} from "@/lib/utils/validators";
import { AbsenteesService, AbsenteeError } from "@/services/AbsenteesService";
import { StorageError } from "@/lib/utils/storage";

/**
 * GET /api/absentees/[id]?page=1&pageSize=20
 * Returns paginated list of absentees for a specific service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    await requireAdmin();

    // Await params (Next.js 13+ requirement)
    const { id: serviceId } = await params;

    // Validate service ID
    if (!serviceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId)) {
      return NextResponse.json(
        {
          error: "Invalid service ID",
          details: "Service ID must be a valid UUID",
        },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = AbsenteesQuerySchema.safeParse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
    });

    if (!queryResult.success) {
      console.error("Invalid query parameters:", queryResult.error.format());
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: queryResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { page, pageSize } = queryResult.data;

    // Fetch absentees with pagination
    const result = await AbsenteesService.getAbsenteesForService(
      serviceId,
      page,
      pageSize
    );

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    console.error(
      `Error in GET /api/absentees/[serviceId]:`,
      error
    );

    // Handle specific error types
    if (error instanceof AbsenteeError) {
      const statusCode =
        error.code === "SERVICE_NOT_FOUND"
          ? 404
          : error.code === "FETCH_SERVICES_FAILED"
          ? 400
          : 500;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: statusCode }
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
        error: "Failed to fetch absentees",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}