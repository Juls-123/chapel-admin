import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import { requireAdmin } from "@/lib/api/auth";
import { z } from "zod";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ServiceWithLevels = Database['public']['Tables']['services']['Row'] & {
  service_levels: Array<{
    level_id: string;
  }>;
};

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const result = querySchema.safeParse({
      date: searchParams.get("date"),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.format() },
        { status: 400 }
      );
    }

    const { date } = result.data;

    // Fetch services for the given date
    const { data: services, error } = await supabaseAdmin
      .from("services")
      .select(
        `
        id,
        name,
        service_type,
        devotion_type,
        service_date,
        service_time,
        status,
        service_levels(level_id)
      `
      )
      .eq("service_date", date)
      .order("service_time", { ascending: true });

    if (error) {
      console.error("Error fetching services:", error);
      throw error;
    }

    // Transform the data to match the expected format
    const formattedServices = (services as unknown as ServiceWithLevels[]).map((service) => ({
      id: service.id,
      name: service.name || `${service.devotion_type ? `${service.devotion_type.charAt(0).toUpperCase() + service.devotion_type.slice(1)} Service` : 'Special Service'
      } - ${service.service_time?.substring(0, 5)}`,
      service_type: service.service_type,
      devotion_type: service.devotion_type,
      service_date: service.service_date,
      service_time: service.service_time,
      status: service.status,
      levels: service.service_levels?.map((sl) => ({
        id: sl.level_id
      })) || [],
    }));

    return NextResponse.json(formattedServices);
  } catch (error) {
    console.error("Error in GET /api/manual-clearance/services:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch services",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
