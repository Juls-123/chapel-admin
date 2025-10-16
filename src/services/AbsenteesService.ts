// src/services/AbsenteesService.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/generated";
import {
  generateAttendancePath,
  downloadJsonFile,
  downloadMultipleJsonFiles,
  StorageError,
} from "@/lib/utils/storage";
import {
  parseAbsenteeRecords,
  mergeAbsenteeRecords,
  toConsolidatedFormat,
  sortAbsentees,
  paginateAbsentees,
  calculateLevelCounts,
  type AbsenteeRecord,
  type LevelAbsenteeData,
  type PaginatedAbsentees,
} from "@/lib/utils/absentees-helpers";

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// All level codes we need to check
const ALL_LEVELS = ["100", "200", "300", "400", "500"];

/**
 * Service with absentee count metadata
 */
export interface ServiceWithAbsenteeCounts {
  id: string;
  name: string;
  service_type: string | null;
  devotion_type: string | null;
  service_date: string;
  service_time: string | null;
  status: string;
  levels: Array<{ id: string }>;
  absentee_counts: {
    total: number;
    by_level: Record<string, number>;
  };
}

/**
 * Custom error for absentee operations
 */
export class AbsenteeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AbsenteeError";
  }
}

export class AbsenteesService {
  /**
   * Get services for a specific date with absentee counts
   */
  static async getServicesWithCounts(
    date: string
  ): Promise<ServiceWithAbsenteeCounts[]> {
    try {
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
        throw new AbsenteeError(
          "Failed to fetch services",
          "FETCH_SERVICES_FAILED",
          { error, date }
        );
      }

      if (!services || services.length === 0) {
        return [];
      }

      // For each service, get absentee counts
      const servicesWithCounts = await Promise.all(
        services.map(async (service) => {
          const counts = await this.getAbsenteeCountsForService(
            service.id,
            date
          );

          return {
            id: service.id,
            name:
              service.name ||
              `${
                service.devotion_type
                  ? `${service.devotion_type.charAt(0).toUpperCase() + service.devotion_type.slice(1)} Service`
                  : "Special Service"
              } - ${service.service_time?.substring(0, 5)}`,
            service_type: service.service_type,
            devotion_type: service.devotion_type,
            service_date: service.service_date,
            service_time: service.service_time,
            status: service.status,
            levels:
              (service.service_levels as any)?.map((sl: any) => ({
                id: sl.level_id,
              })) || [],
            absentee_counts: counts,
          };
        })
      );

      return servicesWithCounts;
    } catch (error) {
      if (error instanceof AbsenteeError) {
        throw error;
      }
      throw new AbsenteeError(
        "Failed to get services with counts",
        "GET_SERVICES_FAILED",
        { originalError: error, date }
      );
    }
  }

  /**
   * Get absentee counts for a specific service across all levels
   */
  private static async getAbsenteeCountsForService(
    serviceId: string,
    date: string
  ): Promise<{ total: number; by_level: Record<string, number> }> {
    try {
      const levelData = await this.fetchAbsenteesForAllLevels(serviceId, date);
      const byLevel = calculateLevelCounts(levelData);
      const total = Object.values(byLevel).reduce((sum, count) => sum + count, 0);

      return { total, by_level: byLevel };
    } catch (error) {
      console.warn(
        `Failed to get absentee counts for service ${serviceId}:`,
        error
      );
      // Return empty counts if there's an error
      return { total: 0, by_level: {} };
    }
  }

  /**
   * Get paginated absentees for a specific service
   */
  static async getAbsenteesForService(
    serviceId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedAbsentees> {
    try {
      // First, get the service to retrieve its date
      const { data: service, error: serviceError } = await supabaseAdmin
        .from("services")
        .select("service_date, name")
        .eq("id", serviceId)
        .single();

      if (serviceError || !service) {
        throw new AbsenteeError(
          `Service not found: ${serviceId}`,
          "SERVICE_NOT_FOUND",
          { serviceId, error: serviceError }
        );
      }

      const date = new Date(service.service_date).toISOString().split("T")[0];

      // Fetch absentees from all levels
      const levelData = await this.fetchAbsenteesForAllLevels(serviceId, date);

      // Merge and deduplicate
      const allAbsentees = mergeAbsenteeRecords(levelData);

      // Convert to consolidated format
      const consolidated = toConsolidatedFormat(allAbsentees);

      // Sort by level and matric number
      const sorted = sortAbsentees(consolidated);

      // Paginate
      return paginateAbsentees(sorted, page, pageSize);
    } catch (error) {
      if (error instanceof AbsenteeError || error instanceof StorageError) {
        throw error;
      }
      throw new AbsenteeError(
        "Failed to get absentees for service",
        "GET_ABSENTEES_FAILED",
        { originalError: error, serviceId }
      );
    }
  }

  /**
   * Fetch absentee data from all level files
   */
  private static async fetchAbsenteesForAllLevels(
    serviceId: string,
    date: string
  ): Promise<LevelAbsenteeData[]> {
    // Generate paths for all level files
    const paths = ALL_LEVELS.map((level) =>
      generateAttendancePath(date, serviceId, level, "absentees.json")
    );

    // Download all files in parallel
    const results = await downloadMultipleJsonFiles<AbsenteeRecord[]>(paths);

    // Process results into level data
    const levelData: LevelAbsenteeData[] = [];

    for (let i = 0; i < ALL_LEVELS.length; i++) {
      const level = ALL_LEVELS[i];
      const result = results[i];

      // Skip if file doesn't exist (null data)
      if (result.data === null) {
        continue;
      }

      // Parse and validate records
      const absentees = parseAbsenteeRecords(result.data, level);

      if (absentees.length > 0) {
        levelData.push({
          level,
          count: absentees.length,
          absentees,
        });
      }
    }

    return levelData;
  }
}