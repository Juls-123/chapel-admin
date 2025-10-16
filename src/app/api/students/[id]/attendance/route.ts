import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

interface ApiError extends Error {
  code?: string;
  details?: any;
  status?: number;
}

function isApiError(error: unknown): error is ApiError {
  return error instanceof Error;
}

/**
 * @deprecated This endpoint is deprecated. Use /api/students/[id]/profile instead.
 * This is a compatibility layer that forwards requests to the new endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure the user is authenticated
    await requireAdmin();
    
    // Log deprecation warning
    console.warn(`DEPRECATED: /api/students/${params.id}/attendance endpoint called. Use /api/students/${params.id}/profile instead.`);
    
    // Forward to the new profile endpoint
    const profileUrl = new URL(
      `/api/students/${params.id}/profile`,
      request.nextUrl.origin
    );
    
    // Copy query parameters
    const searchParams = new URL(request.url).searchParams;
    searchParams.forEach((value, key) => {
      profileUrl.searchParams.set(key, value);
    });
    
    // Fetch from the new endpoint
    const response = await fetch(profileUrl.toString(), {
      headers: request.headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw Object.assign(new Error(error.message || 'Failed to fetch profile'), {
        status: response.status,
        code: error.code || 'PROFILE_FETCH_FAILED',
        details: error.details,
      });
    }
    
    const profile = await response.json();
    
    // Transform the response to match the old format for backward compatibility
    const attendanceRecords = (profile.recent_attendance || []).map((att: any) => ({
      id: att.id,
      student_id: att.student_id,
      service_id: att.service_id,
      status: att.status,
      marked_at: att.marked_at,
      service: att.service ? {
        id: att.service.id,
        name: att.service.name,
        type: att.service.type,
        date: att.service.date,
        start_time: att.service.start_time,
        end_time: att.service.end_time,
      } : null,
    }));
    
    // Return the transformed response with a deprecation warning
    return new NextResponse(JSON.stringify(attendanceRecords), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Deprecation': 'true',
        'Link': '</api/students/[id]/profile>; rel="alternate"; title="New Endpoint"',
        'Warning': '299 - "This endpoint is deprecated. Use /api/students/[id]/profile instead."',
      },
    });
  } catch (error) {
    // Handle errors consistently
    if (isApiError(error)) {
      return new NextResponse(
        JSON.stringify({
          error: error.message,
          code: error.code || 'INTERNAL_SERVER_ERROR',
          details: error.details,
        }),
        {
          status: error.status || 500,
          headers: {
            'Content-Type': 'application/json',
            'Deprecation': 'true',
          },
        }
      );
    }
    
    // Fallback error response
    return new NextResponse(
      JSON.stringify({
        error: 'An unknown error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Deprecation': 'true',
        },
      }
    );
  }
}
