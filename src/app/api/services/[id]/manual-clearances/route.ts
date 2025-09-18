import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/api/auth";
import type { Database } from "@/lib/types/generated";

// Initialize Supabase admin client
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ManualClearance {
  student_id: string;
  matric_number: string;
  name: string;
  reason: string;
  cleared_by: string;
  cleared_at: string;
}

// Enhanced cleared record structure (what's stored in the file)
interface StoredClearanceRecord {
  student_id: string;
  matric_number: string;
  student_name: string;
  gender: string;
  level: string;
  level_id: string;
  clearance: {
    status: string;
    cleared_at: string;
    cleared_by: string;
    admin_id: string;
    reason: string;
    notes?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAdmin(request);

    const resolvedParams = await params;
    const serviceId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const levelCode = searchParams.get("level_code");

    if (!levelCode) {
      return NextResponse.json(
        { error: "level_code parameter is required" },
        { status: 400 }
      );
    }

    // Get service details to construct the storage path
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("service_date")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Construct storage path
    const date = new Date(service.service_date).toISOString().split("T")[0];
    const path = `attendance/${date}/${serviceId}/${levelCode}/manually_cleared.json`;

    // Try to download the file
    const { data, error } = await supabaseAdmin.storage
      .from("attendance-scans")
      .download(path);

    if (error) {
      // If file doesn't exist, return empty array (this is expected for services without clearances)
      if (
        error.message?.includes("not found") ||
        error.message?.includes("Object not found")
      ) {
        return NextResponse.json([]);
      }

      console.error("Storage error fetching manual clearances:", error);
      return NextResponse.json(
        { error: "Failed to fetch manual clearances" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json([]);
    }

    try {
      const text = await data.text();
      const storedClearances = JSON.parse(text) as StoredClearanceRecord[];

      // Validate that it's an array
      if (!Array.isArray(storedClearances)) {
        console.warn(
          "Manual clearances file is not an array, returning empty array"
        );
        return NextResponse.json([]);
      }

      // Transform the stored format to what the frontend expects
      const transformedClearances: ManualClearance[] = storedClearances.map(
        (record) => ({
          student_id: record.student_id,
          matric_number: record.matric_number,
          name: record.student_name, // Transform student_name -> name
          reason: record.clearance.reason, // Extract from nested clearance object
          cleared_by: record.clearance.cleared_by, // Extract from nested clearance object
          cleared_at: record.clearance.cleared_at, // Extract from nested clearance object
        })
      );

      return NextResponse.json(transformedClearances);
    } catch (parseError) {
      console.error("Error parsing manual clearances file:", parseError);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching manual clearances:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
